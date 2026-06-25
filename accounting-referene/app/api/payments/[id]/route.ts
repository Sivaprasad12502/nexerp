import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { syncReceiptsAfterApprovedPayment } from "@/lib/payment-receipt-route-sync";
import { syncBuyerExpenditureOnDebitNotePaid } from "@/lib/sync-vendor-payment";
import { paymentApproveSchema } from "@/lib/validations/payment";

type RouteCtx = { params: Promise<{ id: string }> };

/** PATCH — approve or reject a pending payment. */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.payment.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { document: true },
  });

  if (!existing) {
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

  const { payment, payoutReceiptId } = await prisma.$transaction(async (tx) => {
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

    let payoutReceiptId: string | null = null;

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

      if (existing.document.type === "DEBIT_NOTE") {
        await syncBuyerExpenditureOnDebitNotePaid(
          tx,
          existing.documentId,
          existing.paymentDate.toISOString(),
        );
      }

      const syncResult =
        existing.document.type === "INVOICE"
          ? await syncReceiptsAfterApprovedPayment(tx, {
              payment: p,
              document: existing.document,
              businessId: ctx.businessId,
              userId: ctx.userId,
              paymentDate: existing.paymentDate.toISOString(),
            })
          : { payoutReceiptId: null };
      payoutReceiptId = syncResult.payoutReceiptId;
    }

    return { payment: p, payoutReceiptId };
  });

  return NextResponse.json({ payment, payoutReceiptId });
}
