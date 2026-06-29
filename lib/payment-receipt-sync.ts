import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/payment-receipt-utils";
import {
  backfillProformaPaymentReceiptsFromPaidDocuments,
  backfillProformaPaymentReceiptsFromPayments,
} from "@/lib/proforma-payment-receipt-sync";

type Tx = Prisma.TransactionClient;

const salesInvoiceSelect = {
  id: true,
  businessId: true,
  type: true,
  clientId: true,
  currency: true,
  documentNumber: true,
  totalAmount: true,
  purchasedAt: true,
  settings: true,
} as const;

function parsePaymentStatus(settings: unknown): string {
  if (typeof settings === "object" && settings !== null) {
    const s = settings as Record<string, unknown>;
    return typeof s.paymentStatus === "string" ? s.paymentStatus : "UNPAID";
  }
  return "UNPAID";
}

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
      document: { type: "INVOICE", purchasedAt: null },
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

/**
 * Ensure a settled payment receipt exists for a paid sales invoice (any payment path).
 * Creates an approved payment when none exists (e.g. settings-only mark-paid).
 */
export async function syncPaymentReceiptForPaidInvoice(
  tx: Tx,
  params: {
    invoiceId: string;
    businessId: string;
    userId: string;
    paymentDate?: string;
  },
): Promise<string | null> {
  const document = await tx.document.findFirst({
    where: {
      id: params.invoiceId,
      businessId: params.businessId,
      type: "INVOICE",
      purchasedAt: null,
    },
    select: salesInvoiceSelect,
  });
  if (!document) return null;
  if (parsePaymentStatus(document.settings) !== "PAID") return null;

  const existing = await tx.paymentReceiptAllocation.findFirst({
    where: { documentId: document.id },
    select: { receiptId: true },
  });
  if (existing) return existing.receiptId;

  let payment = await tx.payment.findFirst({
    where: {
      documentId: document.id,
      businessId: params.businessId,
      status: "APPROVED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    const settings =
      typeof document.settings === "object" && document.settings !== null
        ? (document.settings as Record<string, unknown>)
        : {};
    const paymentDateStr =
      params.paymentDate ??
      (typeof settings.paymentDate === "string" ? settings.paymentDate : null) ??
      new Date().toISOString();
    const now = new Date();

    payment = await tx.payment.create({
      data: {
        businessId: document.businessId,
        documentId: document.id,
        amountReceived: document.totalAmount,
        transactionCharge: 0,
        tdsWithheld: 0,
        amountToSettle: 0,
        paymentDate: new Date(paymentDateStr),
        method: "ACCOUNT_TRANSFER",
        status: "APPROVED",
        recordedByUserId: params.userId,
        approvedByUserId: params.userId,
        approvedAt: now,
        notes: "Auto-recorded for payment receipt sync",
      },
    });
  }

  return syncPaymentReceiptForApprovedPayment(tx, {
    payment,
    document,
    userId: params.userId,
  });
}

/** Backfill payment receipts for paid sales invoices with no payment receipt allocation. */
export async function backfillPaymentReceiptsFromPaidInvoices(): Promise<number> {
  const invoices = await prisma.document.findMany({
    where: {
      type: "INVOICE",
      purchasedAt: null,
      paymentReceiptAllocations: { none: {} },
    },
    select: salesInvoiceSelect,
  });

  let created = 0;

  for (const invoice of invoices) {
    if (parsePaymentStatus(invoice.settings) !== "PAID") continue;

    await prisma.$transaction(async (tx) => {
      const receiptId = await syncPaymentReceiptForPaidInvoice(tx, {
        invoiceId: invoice.id,
        businessId: invoice.businessId,
        userId: "system",
      });
      if (receiptId) created += 1;
    });
  }

  return created;
}

/** Run all idempotent payment receipt backfills (sales invoices + proforma invoices). */
export async function backfillAllPaymentReceipts(): Promise<number> {
  const fromInvoicePayments = await backfillPaymentReceiptsFromPayments();
  const fromProformaPayments = await backfillProformaPaymentReceiptsFromPayments();
  const fromPaidInvoices = await backfillPaymentReceiptsFromPaidInvoices();
  const fromPaidProformas = await backfillProformaPaymentReceiptsFromPaidDocuments();
  return fromInvoicePayments + fromProformaPayments + fromPaidInvoices + fromPaidProformas;
}
