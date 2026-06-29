/**
 * Centralized, type-safe, transaction-safe notification service.
 *
 * Accepts either a Prisma transaction client (Prisma.TransactionClient) or the
 * singleton prisma client so callers inside an existing $transaction can stay atomic:
 *
 *   // inside $transaction:
 *   await notifyBusinessOwner(tx, businessId, { ... });
 *
 *   // standalone (fire-and-forget):
 *   try { await notifyBusinessOwner(prisma, businessId, { ... }); } catch { ... }
 */

import type { Prisma } from "@/app/generated/prisma/client";
import { NotificationType } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Re-export so callers never import directly from generated path
export { NotificationType };

type Db = Prisma.TransactionClient | typeof prisma;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
};

/**
 * Create a single notification row. Accepts a tx or standalone prisma client.
 */
export function createNotification(db: Db, input: CreateNotificationInput) {
  return db.notification.create({ data: input });
}

/**
 * Look up a business's owner and create a notification for them.
 * Returns null (and logs) if the business cannot be found.
 */
export async function notifyBusinessOwner(
  db: Db,
  businessId: string,
  input: Omit<CreateNotificationInput, "userId">,
) {
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { userId: true },
  });
  if (!biz) {
    console.warn("[notifications] business not found for notification", { businessId, type: input.type });
    return null;
  }
  return createNotification(db, { ...input, userId: biz.userId });
}

/**
 * Notify both the buyer and the seller when a vendor relationship is established.
 * Always runs on a tx so it stays atomic with the BusinessRelationship upsert.
 */
export async function notifyVendorLinked(
  tx: Db,
  {
    buyerUserId,
    sellerBusinessId,
    quotationId,
    sellerName,
    buyerBusinessName,
  }: {
    buyerUserId: string;
    sellerBusinessId: string;
    quotationId: string;
    sellerName: string;
    buyerBusinessName: string;
  },
) {
  await createNotification(tx, {
    userId: buyerUserId,
    type: NotificationType.VENDOR_LINKED,
    title: "New vendor linked",
    message: `${sellerName} has been added to your vendors after approving their quotation.`,
    entityType: "QUOTATION",
    entityId: quotationId,
  });

  await notifyBusinessOwner(tx, sellerBusinessId, {
    type: NotificationType.VENDOR_LINKED,
    title: "New customer connected",
    message: `${buyerBusinessName} approved your quotation and is now linked as a customer.`,
    entityType: "QUOTATION",
    entityId: quotationId,
  });
}

/**
 * Notify buyer and seller when a vendor is auto-linked from an invoice expenditure.
 */
export async function notifyVendorLinkedFromInvoice(
  tx: Db,
  {
    buyerUserId,
    sellerBusinessId,
    invoiceDocumentId,
    sellerName,
    buyerBusinessName,
  }: {
    buyerUserId: string;
    sellerBusinessId: string;
    invoiceDocumentId: string;
    sellerName: string;
    buyerBusinessName: string;
  },
) {
  await createNotification(tx, {
    userId: buyerUserId,
    type: NotificationType.VENDOR_LINKED,
    title: "New vendor linked",
    message: `${sellerName} has been added to your vendors after adding their invoice as an expenditure.`,
    entityType: "DOCUMENT",
    entityId: invoiceDocumentId,
  });

  await notifyBusinessOwner(tx, sellerBusinessId, {
    type: NotificationType.VENDOR_LINKED,
    title: "New customer connected",
    message: `${buyerBusinessName} added your invoice to their expenditures and is now linked as a customer.`,
    entityType: "DOCUMENT",
    entityId: invoiceDocumentId,
  });
}

/**
 * Notify the vendor (seller) when the PO issuer (buyer) is auto-linked as a Client
 * after the vendor accepts a purchase order.
 */
export async function notifyClientLinked(
  tx: Db,
  {
    vendorBusinessId,
    buyerName,
    documentId,
  }: {
    vendorBusinessId: string;
    buyerName: string;
    documentId: string;
  },
) {
  await notifyBusinessOwner(tx, vendorBusinessId, {
    type: NotificationType.CLIENT_LINKED,
    title: "New client linked",
    message: `${buyerName} has been added to your clients after you accepted their purchase order.`,
    entityType: "DOCUMENT",
    entityId: documentId,
  });
}
