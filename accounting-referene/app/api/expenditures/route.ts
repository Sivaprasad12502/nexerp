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

  // Expenditures are INVOICE-type documents that were converted from a Purchase Order
  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "INVOICE",
      purchasedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const vendors = await prisma.vendor.findMany({
    where: { businessId: ctx.businessId, status: "ACTIVE" },
    select: { name: true, email: true },
  });
  const vendorByName = new Map(
    vendors.map((v) => [v.name.toLowerCase(), v.email]),
  );

  const expenditures = documents.map((doc) => {
    const vendorName = doc.client?.businessName ?? doc.clientName ?? "";
    const vendorEmail =
      getVendorEmailFromDocument(doc) ??
      (vendorName ? vendorByName.get(vendorName.toLowerCase()) ?? null : null);

    const settings =
      typeof doc.settings === "object" && doc.settings !== null
        ? (doc.settings as Record<string, unknown>)
        : {};

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      createdAt: doc.createdAt,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      status: doc.status,
      sentAt: doc.sentAt,
      purchasedAt: doc.purchasedAt,
      paymentStatus: (settings.paymentStatus as string | undefined) ?? "UNPAID",
      paymentDate: (settings.paymentDate as string | null | undefined) ?? null,
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
      emailSent: Boolean(doc.sentAt),
    };
  });

  return NextResponse.json({ expenditures, total: expenditures.length });
}

// ─── POST — create a standalone Purchase / Expense ───────────────────────────

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
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  try {
    const document = await prisma.$transaction(async (tx) => {
      // Count existing expenditures to generate a sequential number
      const count = await tx.document.count({
        where: {
          businessId: ctx.businessId,
          type: "INVOICE",
          purchasedAt: { not: null },
        },
      });
      const prefix = DOCUMENT_TYPE_PREFIX.INVOICE; // "INV"
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
        data.status === "SAVED" ||
        data.status === "SENT" ||
        data.status === "APPROVED"
          ? ("ISSUED" as const)
          : ("DRAFT" as const);

      const ns = (v?: string | null) =>
        v === undefined || v === null || v.trim() === "" ? null : v.trim();

      return tx.document.create({
        data: {
          businessId: ctx.businessId,
          type: "INVOICE",
          // Mark as purchased so it appears in the expenditures list immediately
          purchasedAt: new Date(),
          documentNumber,
          documentDate: data.quotationDate
            ? new Date(data.quotationDate)
            : new Date(),
          validTillDate: data.validTillDate
            ? new Date(data.validTillDate)
            : null,
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
    console.error("[POST /api/expenditures]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
