import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { getVendorEmailFromDocument } from "@/lib/document-adapter";
import { quotationCreateSchema } from "@/lib/validations/quotation";
import { DOCUMENT_TYPE_PREFIX } from "@/lib/validations/document";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: { businessId: ctx.businessId, type: "PURCHASE_ORDER" },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const ids = documents.map((d) => d.id);

  const purchaseConversions = ids.length
    ? await prisma.documentConversion.findMany({
        where: {
          businessId: ctx.businessId,
          sourceType: "PURCHASE_ORDER",
          sourceId: { in: ids },
          targetType: "INVOICE",
        },
        select: { sourceId: true, targetId: true, createdAt: true },
      })
    : [];

  const conversionMap = new Map(
    purchaseConversions.map((c) => [c.sourceId, c]),
  );

  const purchaseIds = purchaseConversions.map((c) => c.targetId);
  const purchaseDocs = purchaseIds.length
    ? await prisma.document.findMany({
        where: { id: { in: purchaseIds } },
        select: { id: true, documentNumber: true },
      })
    : [];
  const purchaseDocMap = new Map(purchaseDocs.map((d) => [d.id, d]));

  const vendors = await prisma.vendor.findMany({
    where: { businessId: ctx.businessId, status: "ACTIVE" },
    select: { name: true, email: true, linkedBusinessId: true },
  });
  const vendorByName = new Map(
    vendors.map((v) => [v.name.toLowerCase(), v.email]),
  );

  const purchaseOrders = documents.map((doc) => {
    const conversion = conversionMap.get(doc.id);
    const purchaseDoc = conversion ? purchaseDocMap.get(conversion.targetId) : null;
    const vendorName = doc.client?.businessName ?? doc.clientName ?? "";
    const vendorEmail =
      getVendorEmailFromDocument(doc) ??
      (vendorName ? vendorByName.get(vendorName.toLowerCase()) ?? null : null);

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      status: doc.status,
      sentAt: doc.sentAt,
      purchasedAt: doc.purchasedAt,
      clientName: doc.clientName,
      fromName: doc.fromName,
      vendorName,
      vendorEmail,
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
      isConvertedToPurchase: Boolean(conversion),
      purchaseDocumentId: purchaseDoc?.id ?? null,
      purchaseDocumentNumber: purchaseDoc?.documentNumber ?? null,
      acceptanceStatus: doc.purchasedAt
        ? "ACCEPTED"
        : doc.sentAt
          ? "PENDING"
          : null,
      emailSent: Boolean(doc.sentAt),
      workflowStatus: doc.purchasedAt ? "Completed" : "Pending",
    };
  });

  return NextResponse.json({ purchaseOrders, total: purchaseOrders.length });
}

// ─── POST — create a standalone Purchase Order ────────────────────────────────

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = quotationCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  try {
    const document = await prisma.$transaction(async (tx) => {
      const count = await tx.document.count({
        where: { businessId: ctx.businessId, type: "PURCHASE_ORDER" },
      });
      const prefix = DOCUMENT_TYPE_PREFIX.PURCHASE_ORDER; // "PO"
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

      return tx.document.create({
        data: {
          businessId: ctx.businessId,
          type: "PURCHASE_ORDER",
          documentNumber,
          documentDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
          validTillDate: data.validTillDate ? new Date(data.validTillDate) : null,
          title: ns(data.quotationTitle),
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
          settings: data.settings ?? {},
          status: docStatus,
          createdByUserId: ctx.userId,
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
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/purchase-orders]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
