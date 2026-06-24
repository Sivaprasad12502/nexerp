import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import {
  convertInvoiceToBuyerExpenditure,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // ── Auth required ──────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── Load invoice by approval token ────────────────────────────────────────
  const invoice = await prisma.document.findUnique({
    where: { approvalToken: token },
  });

  if (!invoice || invoice.type !== "PROFORMA_INVOICE" || invoice.purchasedAt) {
    return NextResponse.json(
      { error: "Proforma invoice not found or link is invalid." },
      { status: 404 },
    );
  }

  // ── Recipient check ────────────────────────────────────────────────────────
  const settings =
    typeof invoice.settings === "object" && invoice.settings !== null
      ? (invoice.settings as Record<string, unknown>)
      : {};

  const recipientEmail = (
    (typeof settings.clientEmail === "string" ? settings.clientEmail : null) ?? ""
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim();
  if (!recipientEmail || !sessionEmail || recipientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can add this proforma invoice as an expenditure. Please sign in with the email address this proforma invoice was sent to.",
      },
      { status: 403 },
    );
  }

  // ── Buyer business required ────────────────────────────────────────────────
  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to add this as an expenditure." },
      { status: 403 },
    );
  }

  // ── Convert ────────────────────────────────────────────────────────────────
  try {
    const result = await convertInvoiceToBuyerExpenditure({
      invoiceDocumentId: invoice.id,
      buyerBusinessId: buyerCtx.businessId,
      buyerUserId: buyerCtx.userId,
      sourceDocumentType: "PROFORMA_INVOICE",
    });

    return NextResponse.json(
      {
        document: result.document,
        created: result.created,
        vendorCreated: result.vendorCreated,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err: unknown) {
    if (err instanceof ConversionError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        NOT_APPROVED: 409,
        DUPLICATE: 409,
        NO_BUSINESS: 403,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    console.error("[public:proforma-invoices:add-expenditure:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
