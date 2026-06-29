import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { syncProformaPaymentReceiptForPaidProforma } from "@/lib/proforma-payment-receipt-sync";

type RouteCtx = { params: Promise<{ id: string }> };

/** PATCH — mark proforma invoice as paid (settings-only path). */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId, type: "PROFORMA_INVOICE" },
    select: { id: true, settings: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Proforma invoice not found" }, { status: 404 });
  }

  let body: { paymentDate?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const paymentDate = body.paymentDate ?? new Date().toISOString();
  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          paymentStatus: "PAID",
          paymentDate,
        },
      },
    });

    await syncProformaPaymentReceiptForPaidProforma(tx, {
      proformaId: id,
      businessId: ctx.businessId,
      userId: ctx.userId,
      paymentDate,
    });
  });

  return NextResponse.json({ success: true });
}
