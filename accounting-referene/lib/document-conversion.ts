/**
 * Document Conversion Engine
 *
 * Converts a source document (currently: Quotation) into one of the five
 * target types (Invoice, Purchase Order, Sales Order, Proforma Invoice,
 * Delivery Challan).  The conversion is atomic — it runs inside a single
 * Prisma transaction that creates the target Document + its items and writes
 * a DocumentConversion audit row.
 *
 * To extend to Document→Document in future phases:
 *   1. Add a new `sourceType` branch to `loadSource()`.
 *   2. No other changes needed.
 */

import type { DocumentType } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calcTotals, numberToWords } from "@/lib/quotation-utils";
import {
  applyIncomingStock,
  resolveWarehouseId,
} from "@/lib/inventory-stock";
import {
  DOCUMENT_TYPE_PREFIX,
  type DocumentTypeValue,
} from "@/lib/validations/document";
import {
  notifyBusinessOwner,
  notifyClientLinked,
  notifyVendorLinkedFromInvoice,
  NotificationType,
} from "@/lib/notifications";
import { getClientDisplayName, getQuotationLabel } from "@/lib/quotation-display";
import {
  ensureVendorRelationship,
  loadSellerSnapshot,
  ensureClientRelationship,
  loadBuyerSnapshot,
} from "@/lib/vendor-relationship";

// ─── Typed error ──────────────────────────────────────────────────────────────

export type ConversionErrorCode =
  | "NOT_FOUND"
  | "NOT_APPROVED"
  | "DUPLICATE"
  | "NO_BUSINESS";

export class ConversionError extends Error {
  constructor(
    public readonly code: ConversionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────

export type ConvertDocumentArgs = {
  businessId: string;
  userId: string;
  sourceType: "QUOTATION";
  sourceId: string;
  targetType: DocumentTypeValue;
};

export type BuyerPurchaseOrderArgs = {
  quotationId: string;
  buyerBusinessId: string;
  buyerUserId: string;
};

export type SalesOrderToBuyerPurchaseOrderArgs = {
  salesOrderId: string;
  buyerBusinessId: string;
  buyerUserId: string;
  documentNumber?: string;
  updateBillingAddress?: boolean;
};

const PO_TARGET: DocumentTypeValue = "PURCHASE_ORDER";
const SO_SOURCE: DocumentTypeValue = "SALES_ORDER";

// ─── Seller-side conversion (quotation owner) ─────────────────────────────────

export async function convertDocument(args: ConvertDocumentArgs) {
  const { businessId, userId, sourceType, sourceId, targetType } = args;

  return prisma.$transaction(async (tx) => {
    // ── 1. Load source ──────────────────────────────────────────────────────
    const quotation = await tx.quotation.findFirst({
      where: { id: sourceId, businessId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!quotation) {
      throw new ConversionError(
        "NOT_FOUND",
        "Quotation not found or does not belong to this business.",
      );
    }

    // ── 2. Status guard ─────────────────────────────────────────────────────
    if (
      quotation.status !== "APPROVED" &&
      quotation.status !== "PURCHASE_ORDER_CREATED"
    ) {
      throw new ConversionError(
        "NOT_APPROVED",
        `Only APPROVED quotations can be converted. Current status: ${quotation.status}.`,
      );
    }

    if (quotation.status === "PURCHASE_ORDER_CREATED" && targetType === PO_TARGET) {
      throw new ConversionError(
        "DUPLICATE",
        "This quotation has already been converted to a purchase order.",
      );
    }

    // ── 3. Duplicate guard ──────────────────────────────────────────────────
    const existing = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType,
          sourceId,
          targetType,
        },
      },
    });
    if (existing) {
      throw new ConversionError(
        "DUPLICATE",
        `This quotation has already been converted to a ${targetType.replace(/_/g, " ")}.`,
      );
    }

    // ── 4. Generate sequential document number ──────────────────────────────
    const prefix = DOCUMENT_TYPE_PREFIX[targetType];
    const count = await tx.document.count({
      where: { businessId, type: targetType as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    // ── 5. Recompute totals from items (source of truth) ───────────────────
    const additionalChargesTotal = (
      Array.isArray(quotation.additionalCharges)
        ? (quotation.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: quotation.items,
      discountAmount: quotation.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    // ── 6. Create document + items ──────────────────────────────────────────
    const document = await tx.document.create({
      data: {
        businessId,
        type:           targetType as DocumentType,
        documentNumber,
        documentDate:   new Date(),
        validTillDate:  null,
        title:          quotation.quotationTitle,
        subtitle:       quotation.subtitle,
        logo:           quotation.logo,
        currency:       quotation.currency,

        fromName:    quotation.fromName,
        fromAddress: quotation.fromAddress,
        fromGstin:   quotation.fromGstin,
        fromPan:     quotation.fromPan,

        clientId:      quotation.clientId,
        clientName:    quotation.clientName,
        clientAddress: quotation.clientAddress,
        clientGstin:   quotation.clientGstin,

        shipFromWarehouseId: quotation.shipFromWarehouseId,
        shippingName:        quotation.shippingName,
        shippingAddress:     quotation.shippingAddress,
        shippingPostalCode:  quotation.shippingPostalCode,
        shippingState:       quotation.shippingState,
        transporterName:     quotation.transporterName,
        distance:            quotation.distance,
        vehicleType:         quotation.vehicleType,
        vehicleNumber:       quotation.vehicleNumber,
        transportDocNumber:  quotation.transportDocNumber,
        transactionType:     quotation.transactionType,

        discountLabel:     quotation.discountLabel,
        discountAmount:    quotation.discountAmount,
        additionalCharges: quotation.additionalCharges as object,

        subTotal:      totals.subTotal,
        totalTax:      totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount:   totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, quotation.currency),

        termsAndConditions: quotation.termsAndConditions,
        notes:              quotation.notes,
        signature:          quotation.signature,
        additionalInfo:     quotation.additionalInfo,
        contactDetails:     quotation.contactDetails,
        attachments:        quotation.attachments,
        customFields:       quotation.customFields as object,
        settings:           quotation.settings as object,

        status:          "ISSUED",
        createdByUserId: userId,

        items: {
          create: quotation.items.map(
            ({ id: _id, quotationId: _qid, ...item }) => ({
              ...item,
              productId: item.productId ?? null,
            }),
          ),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    // ── 7. Audit trail ──────────────────────────────────────────────────────
    await tx.documentConversion.create({
      data: {
        businessId,
        sourceType,
        sourceId,
        targetType,
        targetId:       document.id,
        createdByUserId: userId,
      },
    });

    if (targetType === PO_TARGET) {
      await tx.quotation.update({
        where: { id: sourceId },
        data: {
          status: "PURCHASE_ORDER_CREATED",
          purchaseOrderCreatedAt: new Date(),
        },
      });

      await tx.quotationActivity.create({
        data: {
          quotationId: sourceId,
          action: "QUOTATION_PO_CREATED",
          userId,
          metadata: { documentId: document.id, documentNumber: document.documentNumber },
        },
      });
    }

    return document;
  });
}

// ─── Buyer-side PO conversion (recipient) ────────────────────────────────────

export async function convertQuotationToBuyerPurchaseOrder(args: BuyerPurchaseOrderArgs) {
  const { quotationId, buyerBusinessId, buyerUserId } = args;

  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { businessName: true } },
      },
    });

    if (!quotation) {
      throw new ConversionError("NOT_FOUND", "Quotation not found.");
    }

    const sellerBusinessId = quotation.businessId;

    if (buyerBusinessId === sellerBusinessId) {
      throw new ConversionError(
        "NOT_APPROVED",
        "Cannot create a purchase order from your own quotation.",
      );
    }

    // Idempotent: return existing PO if already converted
    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: "QUOTATION",
          sourceId: quotationId,
          targetType: PO_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    if (quotation.status !== "APPROVED") {
      throw new ConversionError(
        "NOT_APPROVED",
        `Only accepted quotations can be converted. Current status: ${quotation.status}.`,
      );
    }

    const buyerBusiness = await tx.business.findUnique({
      where: { id: buyerBusinessId },
      select: {
        name: true,
        brandName: true,
        country: true,
        gstNumber: true,
      },
    });

    if (!buyerBusiness) {
      throw new ConversionError("NO_BUSINESS", "Buyer business not found.");
    }

    const sellerSnapshot = await loadSellerSnapshot(tx, sellerBusinessId);
    if (sellerSnapshot) {
      await ensureVendorRelationship(tx, {
        buyerBusinessId,
        sellerBusinessId,
        sellerSnapshot,
        quotation,
      });
    }

    const prefix = DOCUMENT_TYPE_PREFIX[PO_TARGET];
    const count = await tx.document.count({
      where: { businessId: buyerBusinessId, type: PO_TARGET as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const additionalChargesTotal = (
      Array.isArray(quotation.additionalCharges)
        ? (quotation.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: quotation.items,
      discountAmount: quotation.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();
    const clientName = getClientDisplayName(quotation);
    const quotationLabel = getQuotationLabel(quotation);

    const document = await tx.document.create({
      data: {
        businessId: buyerBusinessId,
        type: PO_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: quotation.validTillDate,
        title: quotation.quotationTitle,
        subtitle: quotation.subtitle,
        logo: quotation.logo,
        currency: quotation.currency,

        // Buyer is "from" on their PO
        fromName: buyerBusiness.brandName ?? buyerBusiness.name,
        fromAddress: quotation.clientAddress ?? buyerBusiness.country,
        fromGstin: quotation.clientGstin,
        fromPan: null,

        // Seller/vendor is "client" on buyer's PO
        clientId: null,
        clientName: quotation.fromName,
        clientAddress: quotation.fromAddress,
        clientGstin: quotation.fromGstin,

        shipFromWarehouseId: quotation.shipFromWarehouseId,
        shippingName: quotation.shippingName,
        shippingAddress: quotation.shippingAddress,
        shippingPostalCode: quotation.shippingPostalCode,
        shippingState: quotation.shippingState,
        transporterName: quotation.transporterName,
        distance: quotation.distance,
        vehicleType: quotation.vehicleType,
        vehicleNumber: quotation.vehicleNumber,
        transportDocNumber: quotation.transportDocNumber,
        transactionType: quotation.transactionType,

        discountLabel: quotation.discountLabel,
        discountAmount: quotation.discountAmount,
        additionalCharges: quotation.additionalCharges as object,

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, quotation.currency),

        termsAndConditions: quotation.termsAndConditions,
        notes: quotation.notes,
        signature: quotation.signature,
        additionalInfo: quotation.additionalInfo,
        contactDetails: quotation.contactDetails,
        attachments: quotation.attachments,
        customFields: quotation.customFields as object,
        settings: quotation.settings as object,

        status: "ISSUED",
        createdByUserId: buyerUserId,

        items: {
          create: quotation.items.map(
            ({ id: _id, quotationId: _qid, ...item }) => ({
              ...item,
              productId: item.productId ?? null,
            }),
          ),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    await tx.documentConversion.create({
      data: {
        businessId: buyerBusinessId,
        sourceType: "QUOTATION",
        sourceId: quotationId,
        targetType: PO_TARGET,
        targetId: document.id,
        createdByUserId: buyerUserId,
      },
    });

    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        status: "PURCHASE_ORDER_CREATED",
        purchaseOrderCreatedAt: now,
      },
    });

    await tx.quotationActivity.create({
      data: {
        quotationId,
        action: "QUOTATION_PO_CREATED",
        userId: buyerUserId,
        metadata: {
          documentId: document.id,
          documentNumber: document.documentNumber,
          buyerBusinessId,
        },
      },
    });

    await notifyBusinessOwner(tx, sellerBusinessId, {
      type: NotificationType.PURCHASE_ORDER_RECEIVED,
      title: "Purchase Order received from client",
      message: `${clientName} created a purchase order from quotation ${quotationLabel}.`,
      entityType: "QUOTATION",
      entityId: quotationId,
    });

    return { document, created: true };
  });
}

// ─── SO → buyer PO conversion (client accepts sales order) ───────────────────

export async function convertSalesOrderToBuyerPurchaseOrder(
  args: SalesOrderToBuyerPurchaseOrderArgs,
) {
  const {
    salesOrderId,
    buyerBusinessId,
    buyerUserId,
    documentNumber: customNumber,
    updateBillingAddress = false,
  } = args;

  return prisma.$transaction(async (tx) => {
    const salesOrder = await tx.document.findUnique({
      where: { id: salesOrderId, type: SO_SOURCE as DocumentType },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { businessName: true, email: true } },
      },
    });

    if (!salesOrder) {
      throw new ConversionError("NOT_FOUND", "Sales order not found.");
    }

    const sellerBusinessId = salesOrder.businessId;

    if (buyerBusinessId === sellerBusinessId) {
      throw new ConversionError(
        "NOT_APPROVED",
        "Cannot create a purchase order from your own sales order.",
      );
    }

    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: SO_SOURCE,
          sourceId: salesOrderId,
          targetType: PO_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    const buyerBusiness = await tx.business.findUnique({
      where: { id: buyerBusinessId },
      select: {
        name: true,
        brandName: true,
        country: true,
        gstNumber: true,
      },
    });

    if (!buyerBusiness) {
      throw new ConversionError("NO_BUSINESS", "Buyer business not found.");
    }

    const sellerSnapshot = await loadSellerSnapshot(tx, sellerBusinessId);
    if (sellerSnapshot) {
      await ensureVendorRelationship(tx, {
        buyerBusinessId,
        sellerBusinessId,
        sellerSnapshot,
        quotation: { fromAddress: salesOrder.fromAddress },
      });
    }

    const prefix = DOCUMENT_TYPE_PREFIX[PO_TARGET];
    const count = await tx.document.count({
      where: { businessId: buyerBusinessId, type: PO_TARGET as DocumentType },
    });
    const autoNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;
    const documentNumber = customNumber?.trim() || autoNumber;

    const additionalChargesTotal = (
      Array.isArray(salesOrder.additionalCharges)
        ? (salesOrder.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: salesOrder.items,
      discountAmount: salesOrder.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();
    const clientName =
      salesOrder.client?.businessName ?? salesOrder.clientName ?? "Client";
    const soLabel = salesOrder.documentNumber;

    const buyerFromName = buyerBusiness.brandName ?? buyerBusiness.name;
    const buyerFromAddress = updateBillingAddress
      ? buyerBusiness.country
      : (salesOrder.clientAddress ?? buyerBusiness.country);
    const buyerFromGstin = updateBillingAddress
      ? buyerBusiness.gstNumber
      : salesOrder.clientGstin;

    const document = await tx.document.create({
      data: {
        businessId: buyerBusinessId,
        type: PO_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: salesOrder.validTillDate,
        title: salesOrder.title,
        subtitle: salesOrder.subtitle,
        logo: salesOrder.logo,
        currency: salesOrder.currency,

        fromName: buyerFromName,
        fromAddress: buyerFromAddress,
        fromGstin: buyerFromGstin,
        fromPan: null,

        clientId: null,
        clientName: salesOrder.fromName,
        clientAddress: salesOrder.fromAddress,
        clientGstin: salesOrder.fromGstin,

        shipFromWarehouseId: salesOrder.shipFromWarehouseId,
        shippingName: salesOrder.shippingName,
        shippingAddress: salesOrder.shippingAddress,
        shippingPostalCode: salesOrder.shippingPostalCode,
        shippingState: salesOrder.shippingState,
        transporterName: salesOrder.transporterName,
        distance: salesOrder.distance,
        vehicleType: salesOrder.vehicleType,
        vehicleNumber: salesOrder.vehicleNumber,
        transportDocNumber: salesOrder.transportDocNumber,
        transactionType: salesOrder.transactionType,

        discountLabel: salesOrder.discountLabel,
        discountAmount: salesOrder.discountAmount,
        additionalCharges: salesOrder.additionalCharges as object,

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, salesOrder.currency),

        termsAndConditions: salesOrder.termsAndConditions,
        notes: salesOrder.notes,
        signature: salesOrder.signature,
        additionalInfo: salesOrder.additionalInfo,
        contactDetails: salesOrder.contactDetails,
        attachments: salesOrder.attachments,
        customFields: salesOrder.customFields as object,
        settings: salesOrder.settings as object,

        status: "ISSUED",
        createdByUserId: buyerUserId,

        items: {
          create: salesOrder.items.map(
            ({ id: _id, documentId: _did, ...item }) => ({
              ...item,
              productId: item.productId ?? null,
            }),
          ),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    await tx.documentConversion.create({
      data: {
        businessId: buyerBusinessId,
        sourceType: SO_SOURCE,
        sourceId: salesOrderId,
        targetType: PO_TARGET,
        targetId: document.id,
        createdByUserId: buyerUserId,
      },
    });

    const existingSettings =
      typeof salesOrder.settings === "object" && salesOrder.settings !== null
        ? (salesOrder.settings as Record<string, unknown>)
        : {};

    await tx.document.update({
      where: { id: salesOrderId },
      data: {
        settings: {
          ...existingSettings,
          purchaseOrderCreatedAt: now.toISOString(),
          acceptanceStatus: "ACCEPTED",
        },
      },
    });

    await notifyBusinessOwner(tx, sellerBusinessId, {
      type: NotificationType.PURCHASE_ORDER_RECEIVED,
      title: "Purchase Order received from client",
      message: `${clientName} created a purchase order from sales order ${soLabel}.`,
      entityType: "DOCUMENT",
      entityId: salesOrderId,
    });

    return { document, created: true };
  });
}

// ─── PO → Purchase (vendor bill) conversion ───────────────────────────────────

const PURCHASE_TARGET: DocumentTypeValue = "INVOICE";

export type ConvertPoToPurchaseArgs = {
  purchaseOrderId: string;
  businessId: string;
  userId: string;
};

export async function convertPurchaseOrderToPurchase(args: ConvertPoToPurchaseArgs) {
  const { purchaseOrderId, businessId, userId } = args;

  return prisma.$transaction(async (tx) => {
    const po = await tx.document.findFirst({
      where: { id: purchaseOrderId, businessId, type: "PURCHASE_ORDER" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    if (!po) {
      throw new ConversionError("NOT_FOUND", "Purchase order not found.");
    }

    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: "PURCHASE_ORDER",
          sourceId: purchaseOrderId,
          targetType: PURCHASE_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    const prefix = DOCUMENT_TYPE_PREFIX[PURCHASE_TARGET];
    const count = await tx.document.count({
      where: { businessId, type: PURCHASE_TARGET as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const additionalChargesTotal = (
      Array.isArray(po.additionalCharges)
        ? (po.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: po.items,
      discountAmount: po.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();

    const document = await tx.document.create({
      data: {
        businessId,
        type: PURCHASE_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: po.validTillDate,
        title: po.title ?? "Purchase",
        subtitle: po.subtitle,
        logo: po.logo,
        currency: po.currency,
        fromName: po.fromName,
        fromAddress: po.fromAddress,
        fromGstin: po.fromGstin,
        fromPan: po.fromPan,
        clientId: po.clientId,
        clientName: po.clientName,
        clientAddress: po.clientAddress,
        clientGstin: po.clientGstin,
        shipFromWarehouseId: po.shipFromWarehouseId,
        shippingName: po.shippingName,
        shippingAddress: po.shippingAddress,
        shippingPostalCode: po.shippingPostalCode,
        shippingState: po.shippingState,
        transporterName: po.transporterName,
        distance: po.distance,
        vehicleType: po.vehicleType,
        vehicleNumber: po.vehicleNumber,
        transportDocNumber: po.transportDocNumber,
        transactionType: po.transactionType,
        discountLabel: po.discountLabel,
        discountAmount: po.discountAmount,
        additionalCharges: po.additionalCharges as object,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, po.currency),
        termsAndConditions: po.termsAndConditions,
        notes: po.notes,
        signature: po.signature,
        additionalInfo: po.additionalInfo,
        contactDetails: po.contactDetails,
        attachments: po.attachments,
        customFields: po.customFields as object,
        settings: po.settings as object,
        status: "ISSUED",
        purchasedAt: now,
        createdByUserId: userId,
        items: {
          create: po.items.map(
            ({ id: _id, documentId: _did, ...item }) => ({
              ...item,
              productId: item.productId ?? null,
            }),
          ),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    // Increase inventory stock when a PO is converted to a purchase
    const purchaseWarehouseId = await resolveWarehouseId(
      tx,
      businessId,
      document.shipFromWarehouseId,
    );
    if (purchaseWarehouseId) {
      await applyIncomingStock({
        tx,
        businessId,
        warehouseId: purchaseWarehouseId,
        items: document.items,
        reason: `Purchase ${document.documentNumber}`,
      });
    }

    await tx.documentConversion.create({
      data: {
        businessId,
        sourceType: "PURCHASE_ORDER",
        sourceId: purchaseOrderId,
        targetType: PURCHASE_TARGET,
        targetId: document.id,
        createdByUserId: userId,
      },
    });

    await tx.document.update({
      where: { id: purchaseOrderId },
      data: { purchasedAt: now },
    });

    return { document, created: true };
  });
}

// ─── Expense (purchased invoice) → Vendor Invoice conversion ──────────────────
// When a vendor receives a "Purchases and Expenses" email and clicks Accept
// Invoice, this creates a new INVOICE document in the vendor's own business.

const EXPENSE_SOURCE = "INVOICE";
const VENDOR_INVOICE_TARGET: DocumentTypeValue = "INVOICE";

export type ConvertExpenseToVendorInvoiceArgs = {
  expenseDocumentId: string;
  vendorBusinessId: string;
  vendorUserId: string;
  documentNumber?: string;
  updateBillingAddress?: boolean;
};

export async function convertExpenseToVendorInvoice(
  args: ConvertExpenseToVendorInvoiceArgs,
) {
  const {
    expenseDocumentId,
    vendorBusinessId,
    vendorUserId,
    documentNumber: customNumber,
    updateBillingAddress = false,
  } = args;

  return prisma.$transaction(async (tx) => {
    // ── 1. Load the source expense ──────────────────────────────────────────
    const expense = await tx.document.findUnique({
      where: { id: expenseDocumentId, type: EXPENSE_SOURCE as DocumentType },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        business: {
          select: { name: true, brandName: true, country: true, gstNumber: true },
        },
      },
    });

    if (!expense || !expense.purchasedAt) {
      throw new ConversionError(
        "NOT_FOUND",
        "Expense document not found or is not an expense.",
      );
    }

    // ── 2. Prevent self-acceptance ──────────────────────────────────────────
    if (vendorBusinessId === expense.businessId) {
      throw new ConversionError(
        "NOT_APPROVED",
        "Cannot create an invoice from your own expense record.",
      );
    }

    // ── 3. Idempotency check ────────────────────────────────────────────────
    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: EXPENSE_SOURCE,
          sourceId: expenseDocumentId,
          targetType: VENDOR_INVOICE_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    // ── 4. Load vendor business ─────────────────────────────────────────────
    const vendorBusiness = await tx.business.findUnique({
      where: { id: vendorBusinessId },
      select: { name: true, brandName: true, country: true, gstNumber: true },
    });

    if (!vendorBusiness) {
      throw new ConversionError("NO_BUSINESS", "Vendor business not found.");
    }

    // ── 5. Generate document number ─────────────────────────────────────────
    const prefix = DOCUMENT_TYPE_PREFIX[VENDOR_INVOICE_TARGET];
    const count = await tx.document.count({
      where: {
        businessId: vendorBusinessId,
        type: VENDOR_INVOICE_TARGET as DocumentType,
      },
    });
    const autoNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;
    const documentNumber = customNumber?.trim() || autoNumber;

    // ── 6. Compute totals ───────────────────────────────────────────────────
    const additionalChargesTotal = (
      Array.isArray(expense.additionalCharges)
        ? (expense.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: expense.items,
      discountAmount: expense.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();

    // ── 7. Perspective swap ─────────────────────────────────────────────────
    // In the expense: fromName = buyer (your org), clientName = vendor.
    // In the vendor invoice: fromName = vendor, clientName = buyer.
    const vendorFromName = updateBillingAddress
      ? (vendorBusiness.brandName ?? vendorBusiness.name)
      : (expense.clientName ?? vendorBusiness.brandName ?? vendorBusiness.name);
    const vendorFromAddress = updateBillingAddress
      ? vendorBusiness.country
      : (expense.clientAddress ?? vendorBusiness.country);
    const vendorFromGstin = updateBillingAddress
      ? vendorBusiness.gstNumber
      : expense.clientGstin;

    // ── 8. Create vendor invoice ────────────────────────────────────────────
    const document = await tx.document.create({
      data: {
        businessId: vendorBusinessId,
        type: VENDOR_INVOICE_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: expense.validTillDate,
        title: expense.title ?? "Invoice",
        subtitle: expense.subtitle,
        logo: expense.logo,
        currency: expense.currency,

        // Vendor becomes the biller
        fromName: vendorFromName,
        fromAddress: vendorFromAddress,
        fromGstin: vendorFromGstin,
        fromPan: null,

        // Buyer (original expense owner) becomes the client
        clientId: null,
        clientName: expense.fromName,
        clientAddress: expense.fromAddress,
        clientGstin: expense.fromGstin,

        discountLabel: expense.discountLabel,
        discountAmount: expense.discountAmount,
        additionalCharges: expense.additionalCharges as object,

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, expense.currency),

        termsAndConditions: expense.termsAndConditions,
        notes: expense.notes,
        signature: expense.signature,
        additionalInfo: expense.additionalInfo,
        contactDetails: expense.contactDetails,
        attachments: expense.attachments,
        customFields: expense.customFields as object,
        settings: {
          paymentStatus: "UNPAID",
          reverseCharge: "No",
          eInvoiceStatus: "Not Generated",
        },

        status: "ISSUED",
        purchasedAt: null, // this is a real sales invoice, not an expense
        createdByUserId: vendorUserId,

        items: {
          create: expense.items.map(({ id: _id, documentId: _did, ...item }) => ({
            ...item,
            productId: item.productId ?? null,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    // ── 9. Write conversion audit row ───────────────────────────────────────
    await tx.documentConversion.create({
      data: {
        businessId: vendorBusinessId,
        sourceType: EXPENSE_SOURCE,
        sourceId: expenseDocumentId,
        targetType: VENDOR_INVOICE_TARGET,
        targetId: document.id,
        createdByUserId: vendorUserId,
      },
    });

    // ── 10. Stamp acceptance on the source expense ──────────────────────────
    const existingSettings =
      typeof expense.settings === "object" && expense.settings !== null
        ? (expense.settings as Record<string, unknown>)
        : {};

    await tx.document.update({
      where: { id: expenseDocumentId },
      data: {
        settings: {
          ...existingSettings,
          acceptanceStatus: "ACCEPTED",
          invoiceCreatedAt: now.toISOString(),
        },
      },
    });

    // ── 11. Notify the expense owner ────────────────────────────────────────
    const buyerBusinessName =
      expense.business?.brandName ?? expense.business?.name ?? "Buyer";

    await notifyBusinessOwner(tx, expense.businessId, {
      type: NotificationType.INVOICE_RECEIVED,
      title: "Invoice accepted by vendor",
      message: `${buyerBusinessName} — Invoice ${document.documentNumber} created by vendor for expense ${expense.documentNumber}.`,
      entityType: "DOCUMENT",
      entityId: expenseDocumentId,
    });

    return { document, created: true };
  });
}

// ─── Normal Invoice → Buyer Expenditure (client-side, perspective swap) ───────

export type ConvertInvoiceToBuyerExpenditureArgs = {
  invoiceDocumentId: string;
  buyerBusinessId: string;
  buyerUserId: string;
};

/**
 * Client-side: takes a normal invoice sent by a seller and creates an
 * expenditure document in the buyer's own business. This is the mirror of
 * `convertExpenseToVendorInvoice` — the buyer records the invoice as a
 * purchase/expense. Idempotent via DocumentConversion audit row.
 *
 * The DocumentConversion written here (sourceId=expenditure, targetId=invoice)
 * is exactly the shape that `syncBuyerExpenditureOnVendorInvoicePaid` reads, so
 * paid-status sync from the seller's invoice to the buyer's expenditure works
 * automatically with no further changes.
 */
export async function convertInvoiceToBuyerExpenditure(
  args: ConvertInvoiceToBuyerExpenditureArgs,
) {
  const { invoiceDocumentId, buyerBusinessId, buyerUserId } = args;

  return prisma.$transaction(async (tx) => {
    // ── 1. Load the source invoice ──────────────────────────────────────────
    const invoice = await tx.document.findUnique({
      where: { id: invoiceDocumentId, type: "INVOICE" as DocumentType },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        business: {
          select: { name: true, brandName: true, country: true, gstNumber: true },
        },
      },
    });

    if (!invoice || invoice.purchasedAt) {
      // purchasedAt means it is already an expenditure, not a real invoice
      throw new ConversionError(
        "NOT_FOUND",
        "Invoice not found or is not a regular invoice.",
      );
    }

    // ── 2. Prevent self-expensing ───────────────────────────────────────────
    if (buyerBusinessId === invoice.businessId) {
      throw new ConversionError(
        "NOT_APPROVED",
        "Cannot create an expenditure from your own invoice.",
      );
    }

    // ── 3. Load buyer business + auto-provision seller as vendor ────────────
    const buyerBusiness = await tx.business.findUnique({
      where: { id: buyerBusinessId },
      select: { name: true, brandName: true, country: true, gstNumber: true },
    });

    if (!buyerBusiness) {
      throw new ConversionError("NO_BUSINESS", "Buyer business not found.");
    }

    const buyerFromName = buyerBusiness.brandName ?? buyerBusiness.name;

    let vendorCreated = false;
    const sellerSnapshot = await loadSellerSnapshot(tx, invoice.businessId);
    if (sellerSnapshot) {
      const vendorResult = await ensureVendorRelationship(tx, {
        buyerBusinessId,
        sellerBusinessId: invoice.businessId,
        sellerSnapshot,
        quotation: { fromAddress: invoice.fromAddress },
      });
      vendorCreated = vendorResult.vendorCreated;
      if (vendorCreated) {
        await notifyVendorLinkedFromInvoice(tx, {
          buyerUserId,
          sellerBusinessId: invoice.businessId,
          invoiceDocumentId,
          sellerName: sellerSnapshot.brandName ?? sellerSnapshot.name,
          buyerBusinessName: buyerFromName,
        });
      }
    }

    // ── 4. Idempotency: check if buyer already added this invoice ───────────
    const existingConversion = await tx.documentConversion.findFirst({
      where: {
        sourceType: "INVOICE",
        targetType: "INVOICE",
        targetId: invoiceDocumentId,
        businessId: buyerBusinessId,
      },
      include: {
        // load the source (expenditure) document to return it
      },
    });

    if (existingConversion) {
      const existingExpenditure = await tx.document.findUnique({
        where: { id: existingConversion.sourceId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      if (existingExpenditure) {
        return { document: existingExpenditure, created: false, vendorCreated };
      }
    }

    // ── 5. Generate expenditure document number ─────────────────────────────
    const prefix = DOCUMENT_TYPE_PREFIX["INVOICE"];
    const count = await tx.document.count({
      where: { businessId: buyerBusinessId, type: "INVOICE" as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    // ── 6. Recompute totals ─────────────────────────────────────────────────
    const additionalChargesTotal = (
      Array.isArray(invoice.additionalCharges)
        ? (invoice.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: invoice.items,
      discountAmount: invoice.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();

    // ── 7. Perspective swap ─────────────────────────────────────────────────
    // In the invoice: fromName = seller, clientName = buyer.
    // In the expenditure: fromName = buyer (us), clientName = seller (vendor).
    const buyerFromAddress = buyerBusiness.country ?? null;
    const buyerFromGstin = buyerBusiness.gstNumber ?? null;

    // ── 8. Carry over paid status if the invoice is already paid ───────────
    const invoiceSettings =
      typeof invoice.settings === "object" && invoice.settings !== null
        ? (invoice.settings as Record<string, unknown>)
        : {};
    const inheritedPaymentStatus =
      invoiceSettings.paymentStatus === "PAID" ? "PAID" : "UNPAID";
    const inheritedPaymentDate =
      inheritedPaymentStatus === "PAID" ? invoiceSettings.paymentDate : undefined;

    // ── 9. Create expenditure document ─────────────────────────────────────
    const expenditure = await tx.document.create({
      data: {
        businessId: buyerBusinessId,
        type: "INVOICE" as DocumentType,
        documentNumber,
        documentDate: invoice.documentDate ?? now,
        validTillDate: invoice.validTillDate,
        title: invoice.title ?? "Expenditure",
        subtitle: invoice.subtitle,
        logo: invoice.logo,
        currency: invoice.currency,

        // Buyer is the "from" party in their own expenditure
        fromName: buyerFromName,
        fromAddress: buyerFromAddress,
        fromGstin: buyerFromGstin,
        fromPan: null,

        // Seller (original invoice owner) is the vendor/client in the expenditure
        clientId: null,
        clientName: invoice.fromName,
        clientAddress: invoice.fromAddress,
        clientGstin: invoice.fromGstin,

        discountLabel: invoice.discountLabel,
        discountAmount: invoice.discountAmount,
        additionalCharges: invoice.additionalCharges as object,

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, invoice.currency),

        termsAndConditions: invoice.termsAndConditions,
        notes: invoice.notes,
        signature: invoice.signature,
        additionalInfo: invoice.additionalInfo,
        contactDetails: invoice.contactDetails,
        attachments: invoice.attachments,
        customFields: invoice.customFields as object,
        settings: {
          paymentStatus: inheritedPaymentStatus,
          ...(inheritedPaymentDate !== undefined
            ? { paymentDate: inheritedPaymentDate }
            : {}),
          reverseCharge: "No",
          eInvoiceStatus: "Not Generated",
        },

        status: "ISSUED",
        purchasedAt: now, // marks this as an expenditure
        createdByUserId: buyerUserId,

        items: {
          create: invoice.items.map(({ id: _id, documentId: _did, ...item }) => ({
            ...item,
            productId: item.productId ?? null,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    // ── 10. Write conversion audit row ──────────────────────────────────────
    // Shape: sourceId = expenditure, targetId = invoice.
    // This is exactly what syncBuyerExpenditureOnVendorInvoicePaid reads.
    await tx.documentConversion.create({
      data: {
        businessId: buyerBusinessId,
        sourceType: "INVOICE",
        sourceId: expenditure.id,
        targetType: "INVOICE",
        targetId: invoiceDocumentId,
        createdByUserId: buyerUserId,
      },
    });

    // ── 11. Notify the seller ───────────────────────────────────────────────
    await notifyBusinessOwner(tx, invoice.businessId, {
      type: NotificationType.INVOICE_RECEIVED,
      title: "Invoice added as expenditure",
      message: `${buyerFromName} added invoice ${invoice.documentNumber} to their expenditures.`,
      entityType: "DOCUMENT",
      entityId: invoiceDocumentId,
    });

    return { document: expenditure, created: true, vendorCreated };
  });
}

// ─── PO → Sales Order (vendor-side, perspective swap) ─────────────────────────

const SO_TARGET: DocumentTypeValue = "SALES_ORDER";

export type ConvertPoToSalesOrderArgs = {
  purchaseOrderId: string;
  vendorBusinessId: string;
  vendorUserId: string;
};

/**
 * Vendor-side: converts a buyer's Purchase Order into a Sales Order in the
 * vendor's own business. Perspective is swapped — vendor is "from", buyer is
 * "client". Idempotent via DocumentConversion audit row.
 */
export async function convertPurchaseOrderToSalesOrder(
  args: ConvertPoToSalesOrderArgs,
) {
  const { purchaseOrderId, vendorBusinessId, vendorUserId } = args;

  return prisma.$transaction(async (tx) => {
    const po = await tx.document.findFirst({
      where: { id: purchaseOrderId, type: "PURCHASE_ORDER" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        business: {
          select: { name: true, brandName: true, country: true, gstNumber: true },
        },
      },
    });

    if (!po) {
      throw new ConversionError("NOT_FOUND", "Purchase order not found.");
    }

    if (po.businessId === vendorBusinessId) {
      throw new ConversionError(
        "NOT_APPROVED",
        "Cannot create a sales order from your own purchase order.",
      );
    }

    // Idempotent: return existing SO if already converted
    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: "PURCHASE_ORDER",
          sourceId: purchaseOrderId,
          targetType: SO_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    const vendorBusiness = await tx.business.findUnique({
      where: { id: vendorBusinessId },
      select: { name: true, brandName: true, country: true, gstNumber: true },
    });

    if (!vendorBusiness) {
      throw new ConversionError("NO_BUSINESS", "Vendor business not found.");
    }

    // Auto-provision the PO issuer (buyer) as a Client in the vendor's account
    const buyerSnapshot = await loadBuyerSnapshot(tx, po.businessId);
    let autoClientId: string | null = null;
    let buyerDisplayName: string = po.fromName ?? "The buyer";

    if (buyerSnapshot) {
      const clientResult = await ensureClientRelationship(tx, {
        buyerBusinessId: po.businessId,
        sellerBusinessId: vendorBusinessId,
        buyerSnapshot,
        po: { fromAddress: po.fromAddress },
      });
      autoClientId = clientResult.clientId;
      buyerDisplayName = buyerSnapshot.brandName ?? buyerSnapshot.name;
    }

    const prefix = DOCUMENT_TYPE_PREFIX[SO_TARGET];
    const count = await tx.document.count({
      where: { businessId: vendorBusinessId, type: SO_TARGET as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const additionalChargesTotal = (
      Array.isArray(po.additionalCharges)
        ? (po.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: po.items,
      discountAmount: po.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();

    const document = await tx.document.create({
      data: {
        businessId: vendorBusinessId,
        type: SO_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: po.validTillDate,
        title: po.title ?? "Sales Order",
        subtitle: po.subtitle,
        logo: po.logo,
        currency: po.currency,

        // Vendor is "from" on their Sales Order
        fromName: vendorBusiness.brandName ?? vendorBusiness.name,
        fromAddress: po.clientAddress ?? vendorBusiness.country,
        fromGstin: po.clientGstin,
        fromPan: null,

        // Buyer (PO issuer) is "client" on the vendor's Sales Order.
        // clientId is set when auto-provisioning succeeds; snapshot fields kept as fallback.
        clientId: autoClientId,
        clientName: po.fromName,
        clientAddress: po.fromAddress,
        clientGstin: po.fromGstin,

        shipFromWarehouseId: po.shipFromWarehouseId,
        shippingName: po.shippingName,
        shippingAddress: po.shippingAddress,
        shippingPostalCode: po.shippingPostalCode,
        shippingState: po.shippingState,
        transporterName: po.transporterName,
        distance: po.distance,
        vehicleType: po.vehicleType,
        vehicleNumber: po.vehicleNumber,
        transportDocNumber: po.transportDocNumber,
        transactionType: po.transactionType,

        discountLabel: po.discountLabel,
        discountAmount: po.discountAmount,
        additionalCharges: po.additionalCharges as object,

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, po.currency),

        termsAndConditions: po.termsAndConditions,
        notes: po.notes,
        signature: po.signature,
        additionalInfo: po.additionalInfo,
        contactDetails: po.contactDetails,
        attachments: po.attachments,
        customFields: po.customFields as object,
        settings: {},

        status: "ISSUED",
        createdByUserId: vendorUserId,

        items: {
          create: po.items.map(({ id: _id, documentId: _did, ...item }) => ({
            ...item,
            productId: item.productId ?? null,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    await tx.documentConversion.create({
      data: {
        businessId: vendorBusinessId,
        sourceType: "PURCHASE_ORDER",
        sourceId: purchaseOrderId,
        targetType: SO_TARGET,
        targetId: document.id,
        createdByUserId: vendorUserId,
      },
    });

    // Notify the buyer's business (owner of the PO) that vendor accepted it
    await notifyBusinessOwner(tx, po.businessId, {
      type: NotificationType.PURCHASE_ORDER_RECEIVED,
      title: "Purchase Order Accepted",
      message: `${vendorBusiness.brandName ?? vendorBusiness.name} accepted your purchase order and created a sales order.`,
      entityType: "DOCUMENT",
      entityId: purchaseOrderId,
    });

    // Notify the vendor that the buyer was auto-linked as a client
    await notifyClientLinked(tx, {
      vendorBusinessId,
      buyerName: buyerDisplayName,
      documentId: document.id,
    });

    return { document, created: true };
  });
}

// ─── Sales Order → Invoice (vendor issues invoice to buyer) ──────────────────

const INVOICE_TARGET: DocumentTypeValue = "INVOICE";

export type ConvertSalesOrderToInvoiceArgs = {
  salesOrderId: string;
  businessId: string;
  userId: string;
};

/**
 * Converts a Sales Order into an Invoice in the same business. Same-perspective
 * (no swap). Idempotent via DocumentConversion audit row.
 */
export async function convertSalesOrderToInvoice(
  args: ConvertSalesOrderToInvoiceArgs,
) {
  const { salesOrderId, businessId, userId } = args;

  return prisma.$transaction(async (tx) => {
    const so = await tx.document.findFirst({
      where: { id: salesOrderId, businessId, type: "SALES_ORDER" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    if (!so) {
      throw new ConversionError("NOT_FOUND", "Sales order not found.");
    }

    const existingConversion = await tx.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: "SALES_ORDER",
          sourceId: salesOrderId,
          targetType: INVOICE_TARGET,
        },
      },
    });

    if (existingConversion) {
      const existingDoc = await tx.document.findUnique({
        where: { id: existingConversion.targetId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });
      if (existingDoc) return { document: existingDoc, created: false };
    }

    const prefix = DOCUMENT_TYPE_PREFIX[INVOICE_TARGET];
    const count = await tx.document.count({
      where: { businessId, type: INVOICE_TARGET as DocumentType },
    });
    const documentNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const additionalChargesTotal = (
      Array.isArray(so.additionalCharges)
        ? (so.additionalCharges as { amount?: number }[])
        : []
    ).reduce((s, c) => s + (c.amount ?? 0), 0);

    const totals = calcTotals({
      items: so.items,
      discountAmount: so.discountAmount,
      additionalCharges: additionalChargesTotal,
    });

    const now = new Date();

    const document = await tx.document.create({
      data: {
        businessId,
        type: INVOICE_TARGET as DocumentType,
        documentNumber,
        documentDate: now,
        validTillDate: so.validTillDate,
        title: so.title ?? "Invoice",
        subtitle: so.subtitle,
        logo: so.logo,
        currency: so.currency,
        fromName: so.fromName,
        fromAddress: so.fromAddress,
        fromGstin: so.fromGstin,
        fromPan: so.fromPan,
        clientId: so.clientId,
        clientName: so.clientName,
        clientAddress: so.clientAddress,
        clientGstin: so.clientGstin,
        shipFromWarehouseId: so.shipFromWarehouseId,
        shippingName: so.shippingName,
        shippingAddress: so.shippingAddress,
        shippingPostalCode: so.shippingPostalCode,
        shippingState: so.shippingState,
        transporterName: so.transporterName,
        distance: so.distance,
        vehicleType: so.vehicleType,
        vehicleNumber: so.vehicleNumber,
        transportDocNumber: so.transportDocNumber,
        transactionType: so.transactionType,
        discountLabel: so.discountLabel,
        discountAmount: so.discountAmount,
        additionalCharges: so.additionalCharges as object,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, so.currency),
        termsAndConditions: so.termsAndConditions,
        notes: so.notes,
        signature: so.signature,
        additionalInfo: so.additionalInfo,
        contactDetails: so.contactDetails,
        attachments: so.attachments,
        customFields: so.customFields as object,
        settings: {
          ...(typeof so.settings === "object" && so.settings !== null
            ? (so.settings as object)
            : {}),
          paymentStatus: "UNPAID",
          reverseCharge: "No",
          eInvoiceStatus: "Not Generated",
        },
        status: "ISSUED",
        createdByUserId: userId,
        items: {
          create: so.items.map(({ id: _id, documentId: _did, ...item }) => ({
            ...item,
            productId: item.productId ?? null,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    // NOTE: Stock is NOT decremented here. The source Sales Order already
    // decremented inventory when it was created (via applyOutgoingStock in
    // the sales-orders POST route). Decrementing again would double-count.

    await tx.documentConversion.create({
      data: {
        businessId,
        sourceType: "SALES_ORDER",
        sourceId: salesOrderId,
        targetType: INVOICE_TARGET,
        targetId: document.id,
        createdByUserId: userId,
      },
    });

    return { document, created: true };
  });
}
