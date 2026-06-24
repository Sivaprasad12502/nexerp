import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/payment-receipt-utils";

type Tx = Prisma.TransactionClient;

type SyncParams = {
  payment: Payment;
  document: Pick<
    Document,
    "id" | "type" | "clientId" | "currency" | "documentNumber" | "totalAmount"
  >;
  userId: string;
};

/** Create a SETTLED payment receipt + allocation for an approved invoice payment (idempotent). */
export async function syncPaymentReceiptForApprovedPayment(
  tx: Tx,
  { payment, document }: SyncParams,
): Promise<string | null> {

  if (payment.status !== "APPROVED") return null;
  if (document.type !== "INVOICE") return null;

  const existing = await tx.paymentReceiptAllocation.findFirst({
    where: { paymentId: payment.id },
    select: { receiptId: true },
  });
  if (existing) return existing.receiptId;

  const receiptNumber = await generateReceiptNumber(payment.businessId);

  const receipt = await tx.paymentReceipt.create({
    data: {
      businessId: payment.businessId,
      receiptNumber,
      type: "PAYMENT_RECEIPT",
      status: "SETTLED",
      clientId: document.clientId,
      receiptDate: payment.paymentDate,
      currency: document.currency,
      totalAmount: payment.amountReceived,
      lines: {
        create: {
          paymentAccountId: payment.paymentAccountId,
          method: payment.method,
          refId: payment.refId,
          amountReceived: payment.amountReceived,
          amountInBaseCurrency: payment.amountReceived,
          transactionCharge: payment.transactionCharge,
          tags: [],
          sortOrder: 0,
        },
      },
    },
  });

  await tx.paymentReceiptAllocation.create({
    data: {
      receiptId: receipt.id,
      documentId: document.id,
      amountAllocated: payment.amountReceived,
      paymentId: payment.id,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[payment-receipt-sync] Created receipt ${receipt.receiptNumber} for payment ${payment.id} (invoice ${document.documentNumber})`,
    );
  }

  return receipt.id;
}

/** Backfill payment receipts for historical approved invoice payments missing allocations. */
export async function backfillPaymentReceiptsFromPayments(): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      paymentReceiptAllocation: null,
      document: { type: "INVOICE" },
    },
    include: {
      document: {
        select: {
          id: true,
          type: true,
          clientId: true,
          currency: true,
          documentNumber: true,
          totalAmount: true,
          settings: true,
        },
      },
    },
  });

  let created = 0;

  for (const payment of payments) {
    const settings =
      typeof payment.document.settings === "object" && payment.document.settings !== null
        ? (payment.document.settings as Record<string, unknown>)
        : {};
    if (settings.paymentStatus !== "PAID") continue;

    await prisma.$transaction(async (tx) => {
      const receiptId = await syncPaymentReceiptForApprovedPayment(tx, {
        payment,
        document: payment.document,
        userId: payment.approvedByUserId ?? payment.recordedByUserId ?? "system",
      });
      if (receiptId) created += 1;
    });
  }

  return created;
}
