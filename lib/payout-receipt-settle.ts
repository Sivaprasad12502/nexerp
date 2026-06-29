import type { Prisma } from "@/app/generated/prisma/client";
import type { PayoutReceiptCreateInput } from "@/lib/validations/payout-receipt";
import {
  computePayoutReceiptStatus,
  parseInvoicePaymentStatus,
} from "@/lib/payout-receipt-utils";

type Tx = Prisma.TransactionClient;

export async function settleExpendituresForPayout(
  tx: Tx,
  params: {
    businessId: string;
    userId: string;
    receiptId: string;
    receiptDate: string;
    allocations: PayoutReceiptCreateInput["allocations"];
    paymentAccountId?: string | null;
  },
) {
  const now = new Date();
  const paymentDate = params.receiptDate;

  for (const alloc of params.allocations) {
    const document = await tx.document.findFirst({
      where: {
        id: alloc.documentId,
        businessId: params.businessId,
        type: "INVOICE",
        purchasedAt: { not: null },
      },
    });
    if (!document) throw new Error(`INVALID_EXPENDITURE:${alloc.documentId}`);

    const paymentStatus = parseInvoicePaymentStatus(document.settings);
    if (paymentStatus === "PAID") {
      throw new Error(`EXPENDITURE_ALREADY_PAID:${alloc.documentId}`);
    }

    const settings =
      typeof document.settings === "object" && document.settings !== null
        ? (document.settings as Record<string, unknown>)
        : {};

    const paymentRecord = await tx.payment.create({
      data: {
        businessId: params.businessId,
        documentId: document.id,
        amountReceived: alloc.amountAllocated,
        transactionCharge: 0,
        tdsWithheld: 0,
        amountToSettle: Math.max(0, document.totalAmount - alloc.amountAllocated),
        paymentDate: new Date(paymentDate),
        method: "ACCOUNT_TRANSFER",
        status: "APPROVED",
        recordedByUserId: params.userId,
        approvedByUserId: params.userId,
        approvedAt: now,
        paymentAccountId: params.paymentAccountId ?? null,
        notes: `Settled via payout receipt ${params.receiptId}`,
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: {
        settings: {
          ...settings,
          paymentStatus: "PAID",
          paymentDate,
        },
      },
    });

    await tx.payoutReceiptAllocation.create({
      data: {
        receiptId: params.receiptId,
        documentId: document.id,
        amountAllocated: alloc.amountAllocated,
        paymentId: paymentRecord.id,
      },
    });
  }
}

export function sumPayoutLines(lines: PayoutReceiptCreateInput["lines"]) {
  return lines.reduce((s, l) => s + l.amountReceived, 0);
}

export function derivePayoutReceiptStatus(
  type: PayoutReceiptCreateInput["type"],
  totalReceived: number,
  totalAllocated: number,
) {
  return computePayoutReceiptStatus(type, totalReceived, totalAllocated);
}
