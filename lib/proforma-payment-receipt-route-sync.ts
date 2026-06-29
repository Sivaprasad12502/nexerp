import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { syncProformaPaymentReceiptForApprovedPayment } from "@/lib/proforma-payment-receipt-sync";

type Tx = Prisma.TransactionClient;

type PaymentDocument = Pick<
  Document,
  "id" | "type" | "clientId" | "clientName" | "currency" | "documentNumber" | "totalAmount" | "purchasedAt"
>;

/** After an approved proforma payment → settled payment receipt. */
export async function syncProformaReceiptsAfterApprovedPayment(
  tx: Tx,
  params: {
    payment: Payment;
    document: PaymentDocument;
    businessId: string;
    userId: string;
    paymentDate: string;
  },
): Promise<{ paymentReceiptId: string | null }> {
  const paymentReceiptId = await syncProformaPaymentReceiptForApprovedPayment(tx, {
    payment: params.payment,
    document: params.document,
    userId: params.userId,
  });

  return { paymentReceiptId };
}
