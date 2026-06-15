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
  DOCUMENT_TYPE_PREFIX,
  type DocumentTypeValue,
} from "@/lib/validations/document";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";
import { getClientDisplayName, getQuotationLabel } from "@/lib/quotation-display";
import {
  ensureVendorRelationship,
  loadSellerSnapshot,
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

const PO_TARGET: DocumentTypeValue = "PURCHASE_ORDER";

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

        // Buyer (PO issuer) is "client" on the vendor's Sales Order
        clientId: null,
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
        settings: so.settings as object,
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
