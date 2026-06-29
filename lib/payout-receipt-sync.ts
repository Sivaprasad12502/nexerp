import type { Document, Payment, Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { parseInvoicePaymentStatus } from "@/lib/payment-receipt-format";
import { generatePayoutReceiptNumber } from "@/lib/payout-receipt-utils";

type Tx = Prisma.TransactionClient;

type SyncParams = {
  payment: Payment;
  document: Pick<
    Document,
    "id" | "type" | "clientName" | "currency" | "documentNumber" | "totalAmount" | "purchasedAt"
  >;
  userId: string;
  /** Defaults to payment.businessId; use expenditure owner when payment is on a linked doc. */
  receiptBusinessId?: string;
};

const expenditureSelect = {
  id: true,
  businessId: true,
  type: true,
  clientName: true,
  currency: true,
  documentNumber: true,
  totalAmount: true,
  purchasedAt: true,
  settings: true,
} as const;

type ExpenditureRow = Pick<
  Document,
  | "id"
  | "businessId"
  | "type"
  | "clientName"
  | "currency"
  | "documentNumber"
  | "totalAmount"
  | "purchasedAt"
  | "settings"
>;

/** Create a SETTLED payout receipt + allocation for an approved expenditure payment (idempotent). */
export async function syncPayoutReceiptForApprovedPayment(
  tx: Tx,
  { payment, document, receiptBusinessId }: SyncParams,
): Promise<string | null> {
  if (payment.status !== "APPROVED") return null;
  if (document.type !== "INVOICE") return null;
  if (!document.purchasedAt) return null;

  const existing = await tx.payoutReceiptAllocation.findFirst({
    where: { documentId: document.id },
    select: { receiptId: true },
  });
  if (existing) return existing.receiptId;

  const businessId = receiptBusinessId ?? payment.businessId;

  const vendorName = document.clientName?.trim() ?? "";
  const vendor = vendorName
    ? await tx.vendor.findFirst({
        where: {
          businessId,
          name: { equals: vendorName, mode: "insensitive" },
        },
      })
    : null;

  const receiptNumber = await generatePayoutReceiptNumber(businessId);

  const receipt = await tx.payoutReceipt.create({
    data: {
      businessId,
      receiptNumber,
      type: "PAYOUT_RECEIPT",
      status: "SETTLED",
      vendorId: vendor?.id ?? null,
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

  await tx.payoutReceiptAllocation.create({
    data: {
      receiptId: receipt.id,
      documentId: document.id,
      amountAllocated: payment.amountReceived,
      paymentId: payment.id,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[payout-receipt-sync] Created receipt ${receipt.receiptNumber} for payment ${payment.id} (expenditure ${document.documentNumber})`,
    );
  }

  return receipt.id;
}

async function findApprovedPaymentForExpenditure(
  tx: Tx,
  expenditure: ExpenditureRow,
): Promise<Payment | null> {
  const onExpenditure = await tx.payment.findFirst({
    where: {
      documentId: expenditure.id,
      businessId: expenditure.businessId,
      status: "APPROVED",
      payoutReceiptAllocation: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (onExpenditure) return onExpenditure;

  const conversion = await tx.documentConversion.findFirst({
    where: {
      sourceType: "INVOICE",
      targetType: "INVOICE",
      sourceId: expenditure.id,
    },
    select: { targetId: true },
  });
  if (!conversion) return null;

  return tx.payment.findFirst({
    where: {
      documentId: conversion.targetId,
      status: "APPROVED",
      payoutReceiptAllocation: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Ensure a settled payout receipt exists for a paid expenditure (any payment path).
 * Creates an approved payment on the expenditure when none exists (e.g. settings-only PAID).
 */
export async function syncPayoutReceiptForPaidExpenditure(
  tx: Tx,
  params: {
    expenditureId: string;
    businessId: string;
    userId: string;
    paymentDate?: string;
  },
): Promise<string | null> {
  const expenditure = await tx.document.findFirst({
    where: {
      id: params.expenditureId,
      businessId: params.businessId,
      type: "INVOICE",
      purchasedAt: { not: null },
    },
    select: expenditureSelect,
  });
  if (!expenditure) return null;
  if (parseInvoicePaymentStatus(expenditure.settings) !== "PAID") return null;

  const existing = await tx.payoutReceiptAllocation.findFirst({
    where: { documentId: expenditure.id },
    select: { receiptId: true },
  });
  if (existing) return existing.receiptId;

  let payment = await findApprovedPaymentForExpenditure(tx, expenditure);

  if (!payment) {
    const settings =
      typeof expenditure.settings === "object" && expenditure.settings !== null
        ? (expenditure.settings as Record<string, unknown>)
        : {};
    const paymentDateStr =
      params.paymentDate ??
      (typeof settings.paymentDate === "string" ? settings.paymentDate : null) ??
      new Date().toISOString();
    const now = new Date();

    payment = await tx.payment.create({
      data: {
        businessId: expenditure.businessId,
        documentId: expenditure.id,
        amountReceived: expenditure.totalAmount,
        transactionCharge: 0,
        tdsWithheld: 0,
        amountToSettle: 0,
        paymentDate: new Date(paymentDateStr),
        method: "ACCOUNT_TRANSFER",
        status: "APPROVED",
        recordedByUserId: params.userId,
        approvedByUserId: params.userId,
        approvedAt: now,
        notes: "Auto-recorded for payout receipt sync",
      },
    });
  }

  return syncPayoutReceiptForApprovedPayment(tx, {
    payment,
    document: expenditure,
    userId: params.userId,
    receiptBusinessId: expenditure.businessId,
  });
}

/** Backfill payout receipts for historical approved expenditure payments missing allocations. */
export async function backfillPayoutReceiptsFromPayments(): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      payoutReceiptAllocation: null,
      document: { type: "INVOICE", purchasedAt: { not: null } },
    },
    include: {
      document: {
        select: {
          id: true,
          businessId: true,
          type: true,
          clientName: true,
          currency: true,
          documentNumber: true,
          totalAmount: true,
          purchasedAt: true,
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
      const receiptId = await syncPayoutReceiptForApprovedPayment(tx, {
        payment,
        document: payment.document,
        userId: payment.approvedByUserId ?? payment.recordedByUserId ?? "system",
        receiptBusinessId: payment.document.businessId,
      });
      if (receiptId) created += 1;
    });
  }

  return created;
}

/** Backfill payout receipts for paid expenditures with no payout allocation (any pay path). */
export async function backfillPayoutReceiptsFromPaidExpenditures(): Promise<number> {
  const expenditures = await prisma.document.findMany({
    where: {
      type: "INVOICE",
      purchasedAt: { not: null },
      payoutReceiptAllocations: { none: {} },
    },
    select: expenditureSelect,
  });

  let created = 0;

  for (const expenditure of expenditures) {
    if (parseInvoicePaymentStatus(expenditure.settings) !== "PAID") continue;

    await prisma.$transaction(async (tx) => {
      const receiptId = await syncPayoutReceiptForPaidExpenditure(tx, {
        expenditureId: expenditure.id,
        businessId: expenditure.businessId,
        userId: "system",
      });
      if (receiptId) created += 1;
    });
  }

  return created;
}

/** Run all idempotent payout receipt backfills. */
export async function backfillAllPayoutReceipts(): Promise<number> {
  const fromPayments = await backfillPayoutReceiptsFromPayments();
  const fromPaid = await backfillPayoutReceiptsFromPaidExpenditures();
  return fromPayments + fromPaid;
}
