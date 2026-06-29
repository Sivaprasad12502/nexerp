import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import {
  convertSalesOrderToBuyerPurchaseOrder,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ token: string }> };

const convertBodySchema = z.object({
  documentNumber: z.string().optional(),
  updateBillingAddress: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const salesOrder = await prisma.document.findFirst({
    where: { approvalToken: token, type: "SALES_ORDER" },
    include: {
      client: { select: { email: true, businessName: true } },
    },
  });

  if (!salesOrder) {
    return NextResponse.json(
      { error: "Sales order not found or link is invalid" },
      { status: 404 },
    );
  }

  const settings =
    typeof salesOrder.settings === "object" && salesOrder.settings !== null
      ? (salesOrder.settings as Record<string, unknown>)
      : {};

  const clientEmail = (
    (typeof settings.clientEmail === "string" ? settings.clientEmail : null) ??
    salesOrder.client?.email ??
    ""
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim();
  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can accept this sales order. Please sign in with the email address this sales order was sent to.",
      },
      { status: 403 },
    );
  }

  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to create a purchase order." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = convertBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await convertSalesOrderToBuyerPurchaseOrder({
      salesOrderId: salesOrder.id,
      buyerBusinessId: buyerCtx.businessId,
      buyerUserId: buyerCtx.userId,
      documentNumber: parsed.data.documentNumber,
      updateBillingAddress: parsed.data.updateBillingAddress,
    });

    return NextResponse.json(
      {
        document: result.document,
        created: result.created,
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
    console.error("[public:sales-orders:convert-po:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
