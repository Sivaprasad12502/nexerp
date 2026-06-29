import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { quotationCreateSchema } from "@/lib/validations/quotation";
import { DOCUMENT_TYPE_PREFIX } from "@/lib/validations/document";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";
import {
  applyOutgoingStock,
  InsufficientStockError,
  resolveWarehouseId,
} from "@/lib/inventory-stock";

type ProformaSettings = {
  paymentStatus?: string;
  paymentDate?: string;
  reverseCharge?: string;
  eInvoiceStatus?: string;
  eInvoiceDetails?: string;
  eInvoiceAckNo?: string;
  eInvoiceAckDate?: string;
  eWayBillNo?: string;
  eWayBillDate?: string;
  eWayBillValidTill?: string;
  clientEmail?: string;
};

function parseSettings(settings: unknown): ProformaSettings {
  if (typeof settings !== "object" || settings === null) return {};
  return settings as ProformaSettings;
}

function getClientEmail(
  settings: unknown,
  clientEmail: string | null | undefined,
): string | null {
  if (clientEmail) return clientEmail;
  const s = parseSettings(settings);
  return s.clientEmail ?? null;
}

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "PROFORMA_INVOICE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const ids = documents.map((d) => d.id);

  const sourceConversions = ids.length
    ? await prisma.documentConversion.findMany({
        where: {
          businessId: ctx.businessId,
          targetType: "PROFORMA_INVOICE",
          targetId: { in: ids },
        },
        select: { sourceType: true, sourceId: true, targetId: true },
      })
    : [];

  const conversionByTarget = new Map(
    sourceConversions.map((c) => [c.targetId, c]),
  );

  const salesOrderIds = sourceConversions
    .filter((c) => c.sourceType === "SALES_ORDER")
    .map((c) => c.sourceId);

  const salesOrders = salesOrderIds.length
    ? await prisma.document.findMany({
        where: { id: { in: salesOrderIds } },
        select: { id: true, documentNumber: true },
      })
    : [];
  const salesOrderMap = new Map(salesOrders.map((so) => [so.id, so]));

  const proformaToInvoiceConversions = ids.length
    ? await prisma.documentConversion.findMany({
        where: {
          businessId: ctx.businessId,
          sourceType: "PROFORMA_INVOICE",
          targetType: "INVOICE",
          sourceId: { in: ids },
        },
        select: { sourceId: true, targetId: true },
      })
    : [];

  const invoiceIds = proformaToInvoiceConversions.map((c) => c.targetId);
  const invoices = invoiceIds.length
    ? await prisma.document.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, documentNumber: true },
      })
    : [];
  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));
  const convertedBySource = new Map(
    proformaToInvoiceConversions.map((c) => [c.sourceId, c.targetId]),
  );

  const proformaInvoices = documents.map((doc) => {
    const conversion = conversionByTarget.get(doc.id);
    const settings = parseSettings(doc.settings);
    const billedTo = doc.client?.businessName ?? doc.clientName ?? "";
    const clientEmail = getClientEmail(doc.settings, doc.client?.email);

    const paymentStatus = settings.paymentStatus ?? "UNPAID";
    const sourceSalesOrder =
      conversion?.sourceType === "SALES_ORDER"
        ? salesOrderMap.get(conversion.sourceId)
        : null;

    const convertedInvoiceId = convertedBySource.get(doc.id) ?? null;
    const convertedInvoice = convertedInvoiceId
      ? invoiceMap.get(convertedInvoiceId)
      : null;

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      status: doc.status,
      sentAt: doc.sentAt,
      fromName: doc.fromName,
      billedTo,
      clientName: billedTo,
      clientEmail,
      client: doc.client,
      items: doc.items.map((item) => ({
        id: item.id,
        name: item.name,
        hsnSac: item.hsnSac,
        sku: item.sku,
        taxRate: item.taxRate,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        total: item.total,
      })),
      settings: doc.settings,
      paymentStatus,
      paymentDate: settings.paymentDate ?? null,
      reverseCharge: settings.reverseCharge ?? "No",
      eInvoiceStatus: settings.eInvoiceStatus ?? "Not Generated",
      eInvoiceDetails: settings.eInvoiceDetails ?? null,
      eInvoiceAckNo: settings.eInvoiceAckNo ?? null,
      eInvoiceAckDate: settings.eInvoiceAckDate ?? null,
      eWayBillNo: settings.eWayBillNo ?? null,
      eWayBillDate: settings.eWayBillDate ?? null,
      eWayBillValidTill: settings.eWayBillValidTill ?? null,
      emailSent: Boolean(doc.sentAt),
      acceptanceStatus:
        conversion?.sourceType === "SALES_ORDER"
          ? ("ACCEPTED" as const)
          : conversion
            ? ("ACCEPTED" as const)
            : null,
      isFromSalesOrder: conversion?.sourceType === "SALES_ORDER",
      isConvertedToInvoice: Boolean(convertedInvoiceId),
      convertedInvoiceId: convertedInvoice?.id ?? null,
      convertedInvoiceNumber: convertedInvoice?.documentNumber ?? null,
      sourceType: conversion?.sourceType ?? null,
      sourceId: conversion?.sourceId ?? null,
      salesOrderId: sourceSalesOrder?.id ?? null,
      salesOrderNumber: sourceSalesOrder?.documentNumber ?? null,
      workflowName: "—",
      currentAssignee: "—",
      currentStage: "—",
      currentStatus: paymentStatus === "PAID" ? "Completed" : "Active",
    };
  });

  return NextResponse.json({ proformaInvoices, total: proformaInvoices.length });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = quotationCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  try {
    const document = await prisma.$transaction(async (tx) => {
      const count = await tx.document.count({
        where: { businessId: ctx.businessId, type: "PROFORMA_INVOICE" },
      });
      const prefix = DOCUMENT_TYPE_PREFIX.PROFORMA_INVOICE;
      const documentNumber =
        data.quotationNumber?.trim() ||
        `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const enrichedItems = (data.items ?? []).map((item, i) => {
        const { amount, taxAmount, total } = calcItem({
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
        });
        return { ...item, amount, taxAmount, total, sortOrder: i };
      });

      const additionalChargesTotal = (data.additionalCharges ?? []).reduce(
        (s, c) => s + (Number(c.amount) || 0),
        0,
      );

      const totals = calcTotals({
        items: enrichedItems,
        discountAmount: Number(data.discountAmount) || 0,
        additionalCharges: additionalChargesTotal,
      });

      const currency = data.currency || "AED";
      const amountInWords = numberToWords(totals.totalAmount, currency);

      const docStatus =
        data.status === "SAVED" || data.status === "SENT" || data.status === "APPROVED"
          ? ("ISSUED" as const)
          : ("DRAFT" as const);

      const ns = (v?: string | null) =>
        v === undefined || v === null || v.trim() === "" ? null : v.trim();

      const baseSettings =
        typeof data.settings === "object" && data.settings !== null
          ? (data.settings as object)
          : {};

      const { businessId, userId } = ctx;

      const doc = await tx.document.create({
        data: {
          businessId,
          type: "PROFORMA_INVOICE",
          documentNumber,
          documentDate: data.quotationDate
            ? new Date(data.quotationDate)
            : new Date(),
          validTillDate: data.validTillDate ? new Date(data.validTillDate) : null,
          title: ns(data.quotationTitle) ?? "Proforma Invoice",
          subtitle: ns(data.subtitle),
          logo: ns(data.logo),
          currency,
          fromName: ns(data.fromName),
          fromAddress: ns(data.fromAddress),
          fromGstin: ns(data.fromGstin),
          fromPan: ns(data.fromPan),
          clientId: ns(data.clientId),
          clientName: ns(data.clientName),
          clientAddress: ns(data.clientAddress),
          clientGstin: ns(data.clientGstin),
          shipFromWarehouseId: ns(data.shipFromWarehouseId),
          shippingName: ns(data.shippingName),
          shippingAddress: ns(data.shippingAddress),
          shippingPostalCode: ns(data.shippingPostalCode),
          shippingState: ns(data.shippingState),
          transporterName: ns(data.transporterName),
          distance: ns(data.distance),
          vehicleType: ns(data.vehicleType),
          vehicleNumber: ns(data.vehicleNumber),
          transportDocNumber: ns(data.transportDocNumber),
          transactionType: ns(data.transactionType),
          discountLabel: ns(data.discountLabel),
          discountAmount: Number(data.discountAmount) || 0,
          additionalCharges: data.additionalCharges ?? [],
          subTotal: totals.subTotal,
          totalTax: totals.totalTax,
          totalDiscount: totals.totalDiscount,
          totalQuantity: totals.totalQuantity,
          totalAmount: totals.totalAmount,
          amountInWords,
          termsAndConditions: ns(data.termsAndConditions),
          notes: ns(data.notes),
          signature: ns(data.signature),
          additionalInfo: ns(data.additionalInfo),
          contactDetails: ns(data.contactDetails),
          attachments: data.attachments ?? [],
          customFields: data.customFields ?? [],
          settings: {
            ...baseSettings,
            paymentStatus: "UNPAID",
            reverseCharge: "No",
            eInvoiceStatus: "Not Generated",
          },
          status: docStatus,
          createdByUserId: userId,
          items: {
            create: enrichedItems.map(({ productId, ...item }) => ({
              ...item,
              productId: ns(productId as string | undefined),
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });

      const warehouseId = await resolveWarehouseId(
        tx,
        businessId,
        doc.shipFromWarehouseId,
      );
      if (warehouseId) {
        await applyOutgoingStock({
          tx,
          businessId,
          warehouseId,
          items: doc.items,
          reason: `Proforma Invoice ${doc.documentNumber}`,
        });
      }

      return doc;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/proforma-invoices]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
