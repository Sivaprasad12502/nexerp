import type {
  PaymentReceipt,
  PaymentReceiptLine,
  PaymentReceiptAllocation,
  Payment,
  Client,
  PaymentAccount,
  Document,
  Business,
} from "@/app/generated/prisma/client";

import { resolveReceiptDisplayStatus } from "@/lib/payment-receipt-utils";

type LineWithAccount = PaymentReceiptLine & {
  paymentAccount?: Pick<PaymentAccount, "id" | "displayName" | "bankName" | "accountNumber"> | null;
};

type AllocationWithDoc = PaymentReceiptAllocation & {
  document?: Pick<Document, "id" | "documentNumber" | "documentDate" | "totalAmount" | "currency"> | null;
  payment?: Pick<Payment, "id" | "tdsWithheld" | "transactionCharge"> | null;
};

export function mapPaymentReceiptRow(
  receipt: PaymentReceipt & {
    client?: Pick<Client, "id" | "businessName" | "email" | "country"> | null;
    business?: Pick<Business, "name" | "brandName" | "country"> | null;
    lines?: LineWithAccount[];
    allocations?: AllocationWithDoc[];
  },
) {
  const settings =
    typeof receipt.settings === "object" && receipt.settings !== null
      ? (receipt.settings as Record<string, unknown>)
      : {};

  const allocations = (receipt.allocations ?? []).map((a) => ({
      id: a.id,
      documentId: a.documentId,
      documentNumber: a.document?.documentNumber ?? null,
      documentDate: a.document?.documentDate?.toISOString() ?? null,
      documentTotal: a.document?.totalAmount ?? null,
      documentCurrency: a.document?.currency ?? null,
      amountAllocated: a.amountAllocated,
      paymentId: a.paymentId ?? null,
      tdsWithheld: a.payment?.tdsWithheld ?? 0,
      transactionCharge: a.payment?.transactionCharge ?? 0,
    }));

  return {
    id: receipt.id,
    businessId: receipt.businessId,
    receiptNumber: receipt.receiptNumber,
    type: receipt.type,
    status: receipt.status,
    displayStatus: resolveReceiptDisplayStatus(
      receipt.status,
      receipt.type,
      allocations.length,
    ),
    clientId: receipt.clientId,
    clientName: receipt.client?.businessName ?? null,
    clientEmail: receipt.client?.email ?? null,
    clientCountry: receipt.client?.country ?? null,
    businessName: receipt.business?.brandName ?? receipt.business?.name ?? null,
    businessCountry: receipt.business?.country ?? null,
    receiptDate: receipt.receiptDate.toISOString(),
    currency: receipt.currency,
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
    totalAmount: receipt.totalAmount,
    emailSentAt: receipt.emailSentAt?.toISOString() ?? null,
    emailSent: Boolean(receipt.emailSentAt),
    notes: receipt.notes ?? null,
    signature: receipt.signature ?? null,
    additionalInfo: receipt.additionalInfo ?? null,
    contactDetails: receipt.contactDetails ?? null,
    attachments: receipt.attachments ?? [],
    settings,
    lines: (receipt.lines ?? []).map((line) => ({
      id: line.id,
      paymentAccountId: line.paymentAccountId,
      paymentAccountName: line.paymentAccount?.displayName ?? null,
      bankName: line.paymentAccount?.bankName ?? null,
      accountNumber: line.paymentAccount?.accountNumber ?? null,
      method: line.method,
      refId: line.refId,
      amountReceived: line.amountReceived,
      amountInBaseCurrency: line.amountInBaseCurrency,
      transactionCharge: line.transactionCharge,
      tags: line.tags,
      sortOrder: line.sortOrder,
    })),
    allocations,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
  };
}

export type PaymentReceiptRow = ReturnType<typeof mapPaymentReceiptRow>;
