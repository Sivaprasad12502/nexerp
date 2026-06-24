import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/payment-receipt-utils";

type Tx = Prisma.TransactionClient;

const proformaSelect = {
  id: true,
  businessId: true,
  type: true,
  clientId: true,
  currency: true,
  documentNumber: true,
  totalAmount: true,
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

/** Create a SETTLED payment receipt + allocation for an approved proforma payment (idempotent). */
export async function syncProformaPaymentReceiptForApprovedPayment(
  tx: Tx,
  { payment, document }: SyncParams,
): Promise<string | null> {
  if (payment.status !== "APPROVED") return null;
  if (document.type !== "PROFORMA_INVOICE") return null;

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
      `[proforma-payment-receipt-sync] Created receipt ${receipt.receiptNumber} for payment ${payment.id} (proforma ${document.documentNumber})`,
    );
  }

  return receipt.id;
}

/** Backfill payment receipts for historical approved proforma payments missing allocations. */
export async function backfillProformaPaymentReceiptsFromPayments(): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      paymentReceiptAllocation: null,
      document: { type: "PROFORMA_INVOICE" },
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
      const receiptId = await syncProformaPaymentReceiptForApprovedPayment(tx, {
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
 * Ensure a settled payment receipt exists for a paid proforma (any payment path).
 * Creates an approved payment when none exists (e.g. settings-only mark-paid).
 */
export async function syncProformaPaymentReceiptForPaidProforma(
  tx: Tx,
  params: {
    proformaId: string;
    businessId: string;
    userId: string;
    paymentDate?: string;
  },
): Promise<string | null> {
  const document = await tx.document.findFirst({
    where: {
      id: params.proformaId,
      businessId: params.businessId,
      type: "PROFORMA_INVOICE",
    },
    select: proformaSelect,
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
        notes: "Auto-recorded for proforma payment receipt sync",
      },
    });
  }

  return syncProformaPaymentReceiptForApprovedPayment(tx, {
    payment,
    document,
    userId: params.userId,
  });
}

/** Backfill payment receipts for paid proformas with no payment receipt allocation. */
export async function backfillProformaPaymentReceiptsFromPaidDocuments(): Promise<number> {
  const proformas = await prisma.document.findMany({
    where: {
      type: "PROFORMA_INVOICE",
      paymentReceiptAllocations: { none: {} },
    },
    select: proformaSelect,
  });

  let created = 0;

  for (const proforma of proformas) {
    if (parsePaymentStatus(proforma.settings) !== "PAID") continue;

    await prisma.$transaction(async (tx) => {
      const receiptId = await syncProformaPaymentReceiptForPaidProforma(tx, {
        proformaId: proforma.id,
        businessId: proforma.businessId,
        userId: "system",
      });
      if (receiptId) created += 1;
    });
  }

  return created;
}
