import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { syncProformaReceiptsAfterApprovedPayment } from "@/lib/proforma-payment-receipt-route-sync";
import { paymentApproveSchema } from "@/lib/validations/payment";

type RouteCtx = { params: Promise<{ id: string }> };

/** PATCH — approve or reject a pending proforma payment. */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.payment.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { document: true },
  });

  if (!existing || existing.document.type !== "PROFORMA_INVOICE") {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = paymentApproveSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { status, transactionCharge = 0, tdsWithheld = 0, paymentAccountId } = result.data;

  const now = new Date();
  const amountToSettle =
    status === "APPROVED"
      ? existing.amountReceived + transactionCharge + tdsWithheld
      : existing.amountToSettle;

  const docSettings =
    typeof existing.document.settings === "object" &&
    existing.document.settings !== null
      ? (existing.document.settings as Record<string, unknown>)
      : {};

  const { payment, paymentReceiptId } = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id },
      data: {
        status,
        transactionCharge,
        tdsWithheld,
        amountToSettle,
        approvedByUserId: ctx.userId,
        approvedAt: now,
        ...(paymentAccountId !== undefined
          ? { paymentAccountId: paymentAccountId ?? null }
          : {}),
      },
    });

    let paymentReceiptId: string | null = null;

    if (status === "APPROVED") {
      await tx.document.update({
        where: { id: existing.documentId },
        data: {
          settings: {
            ...docSettings,
            paymentStatus: "PAID",
            paymentDate: existing.paymentDate.toISOString(),
          },
        },
      });

      const syncResult = await syncProformaReceiptsAfterApprovedPayment(tx, {
        payment: p,
        document: existing.document,
        businessId: ctx.businessId,
        userId: ctx.userId,
        paymentDate: existing.paymentDate.toISOString(),
      });
      paymentReceiptId = syncResult.paymentReceiptId;
    }

    return { payment: p, paymentReceiptId };
  });

  return NextResponse.json({ payment, paymentReceiptId });
}
