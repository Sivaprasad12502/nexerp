import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { syncPaymentReceiptForApprovedPayment } from "@/lib/payment-receipt-sync";
import {
  syncPayoutReceiptForApprovedPayment,
  syncPayoutReceiptForPaidExpenditure,
} from "@/lib/payout-receipt-sync";
import { syncBuyerExpenditureOnVendorInvoicePaid } from "@/lib/sync-vendor-payment";

type Tx = Prisma.TransactionClient;

type PaymentDocument = Pick<
  Document,
  "id" | "type" | "clientId" | "clientName" | "currency" | "documentNumber" | "totalAmount" | "purchasedAt"
>;

/**
 * After an approved payment: sales invoice → payment receipt;
 * expenditure (or linked buyer expenditure) → settled payout receipt.
 */
export async function syncReceiptsAfterApprovedPayment(
  tx: Tx,
  params: {
    payment: Payment;
    document: PaymentDocument;
    businessId: string;
    userId: string;
    paymentDate: string;
  },
): Promise<{ payoutReceiptId: string | null }> {
  const buyerSync = await syncBuyerExpenditureOnVendorInvoicePaid(
    tx,
    params.document.id,
    params.paymentDate,
  );

  let payoutReceiptId: string | null = null;

  if (params.document.purchasedAt) {
    payoutReceiptId = await syncPayoutReceiptForApprovedPayment(tx, {
      payment: params.payment,
      document: params.document,
      userId: params.userId,
      receiptBusinessId: params.businessId,
    });
  } else {
    await syncPaymentReceiptForApprovedPayment(tx, {
      payment: params.payment,
      document: params.document,
      userId: params.userId,
    });

    if (buyerSync.expenditureId) {
      const linkedExpenditure = await tx.document.findUnique({
        where: { id: buyerSync.expenditureId },
        select: { businessId: true },
      });
      if (linkedExpenditure) {
        payoutReceiptId = await syncPayoutReceiptForPaidExpenditure(tx, {
          expenditureId: buyerSync.expenditureId,
          businessId: linkedExpenditure.businessId,
          userId: params.userId,
          paymentDate: params.paymentDate,
        });
      }
    }
  }

  return { payoutReceiptId };
}
