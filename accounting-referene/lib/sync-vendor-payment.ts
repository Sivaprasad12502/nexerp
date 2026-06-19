import type { Prisma } from "@/app/generated/prisma/client";

type Db = Prisma.TransactionClient;

function parseSettings(settings: unknown): Record<string, unknown> {
  if (typeof settings === "object" && settings !== null) {
    return settings as Record<string, unknown>;
  }
  return {};
}

/**
 * When a vendor marks their sales invoice paid, sync payment status to the
 * linked buyer expenditure (DocumentConversion: expense INVOICE → vendor INVOICE).
 */
export async function syncBuyerExpenditureOnVendorInvoicePaid(
  tx: Db,
  vendorInvoiceId: string,
  paymentDate: string,
): Promise<{ synced: boolean; expenditureId?: string }> {
  const conversion = await tx.documentConversion.findFirst({
    where: {
      sourceType: "INVOICE",
      targetType: "INVOICE",
      targetId: vendorInvoiceId,
    },
    select: { sourceId: true },
  });

  if (!conversion) {
    return { synced: false };
  }

  const expenditure = await tx.document.findUnique({
    where: { id: conversion.sourceId },
    select: { id: true, purchasedAt: true, settings: true },
  });

  if (!expenditure?.purchasedAt) {
    return { synced: false };
  }

  const existingSettings = parseSettings(expenditure.settings);
  if (existingSettings.paymentStatus === "PAID") {
    return { synced: false, expenditureId: expenditure.id };
  }

  await tx.document.update({
    where: { id: expenditure.id },
    data: {
      settings: {
        ...existingSettings,
        paymentStatus: "PAID",
        paymentDate,
      },
    },
  });

  return { synced: true, expenditureId: expenditure.id };
}
