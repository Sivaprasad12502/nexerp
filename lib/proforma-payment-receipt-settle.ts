import type { Prisma } from "@/app/generated/prisma/client";
import type { PaymentReceiptCreateInput } from "@/lib/validations/payment-receipt";
import { parseInvoicePaymentStatus } from "@/lib/payment-receipt-utils";

type Tx = Prisma.TransactionClient;

export async function settleProformaInvoicesForReceipt(
  tx: Tx,
  params: {
    businessId: string;
    userId: string;
    receiptId: string;
    receiptDate: string;
    allocations: PaymentReceiptCreateInput["allocations"];
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
        type: "PROFORMA_INVOICE",
      },
    });
    if (!document) throw new Error(`INVALID_PROFORMA:${alloc.documentId}`);

    const paymentStatus = parseInvoicePaymentStatus(document.settings);
    if (paymentStatus === "PAID") {
      throw new Error(`PROFORMA_ALREADY_PAID:${alloc.documentId}`);
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
        notes: `Settled via payment receipt ${params.receiptId}`,
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

    await tx.paymentReceiptAllocation.create({
      data: {
        receiptId: params.receiptId,
        documentId: document.id,
        amountAllocated: alloc.amountAllocated,
        paymentId: paymentRecord.id,
      },
    });
  }
}
