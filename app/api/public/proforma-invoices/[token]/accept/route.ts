import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import {
  convertExpenseToVendorInvoice,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ token: string }> };

const acceptBodySchema = z.object({
  documentNumber: z.string().optional(),
  updateBillingAddress: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // ── Auth required ──────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── Load expense document ──────────────────────────────────────────────────
  const expense = await prisma.document.findFirst({
    where: { approvalToken: token, type: "PROFORMA_INVOICE" },
  });

  if (!expense || !expense.purchasedAt) {
    return NextResponse.json(
      { error: "Expense document not found or link is invalid." },
      { status: 404 },
    );
  }

  // ── Recipient check ────────────────────────────────────────────────────────
  const settings =
    typeof expense.settings === "object" && expense.settings !== null
      ? (expense.settings as Record<string, unknown>)
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
          "Only the intended recipient can accept this invoice. Please sign in with the email address this invoice was sent to.",
      },
      { status: 403 },
    );
  }

  // ── Vendor business required ───────────────────────────────────────────────
  const vendorCtx = await getRbacContext();
  if (!vendorCtx) {
    return NextResponse.json(
      { error: "You need a business account to create an invoice." },
      { status: 403 },
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = acceptBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ── Convert ────────────────────────────────────────────────────────────────
  try {
    const result = await convertExpenseToVendorInvoice({
      expenseDocumentId: expense.id,
      vendorBusinessId: vendorCtx.businessId,
      vendorUserId: vendorCtx.userId,
      documentNumber: parsed.data.documentNumber,
      updateBillingAddress: parsed.data.updateBillingAddress,
    });

    return NextResponse.json(
      { document: result.document, created: result.created },
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
    console.error("[public:invoices:accept:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
