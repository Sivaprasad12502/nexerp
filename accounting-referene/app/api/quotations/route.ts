import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { quotationCreateSchema } from "@/lib/validations/quotation";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";

// ─── Helper: auto-generate quotation number ───────────────────────────────────

async function generateQuotationNumber(businessId: string): Promise<string> {
  const count = await prisma.quotation.count({ where: { businessId } });
  return `QT-${String(count + 1).padStart(4, "0")}`;
}

// ─── Helper: compute & attach calc results to items ──────────────────────────

function enrichItems(items: { quantity: number; rate: number; discount: number; taxRate: number }[]) {
  return items.map((item) => {
    const { amount, taxAmount, total } = calcItem(item);
    return { ...item, amount, taxAmount, total };
  });
}

// ─── GET  /api/quotations ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = (req.nextUrl.searchParams.get("status") ?? "DRAFT").toUpperCase();
  const resolvedStatus =
    status === "SAVED" ? "SAVED" : status === "CANCELLED" ? "CANCELLED" : "DRAFT";
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const quotations = await prisma.quotation.findMany({
    where: {
      businessId: ctx.businessId,
      status: resolvedStatus as "DRAFT" | "SAVED" | "CANCELLED",
      ...(search && {
        OR: [
          { quotationNumber: { contains: search, mode: "insensitive" } },
          { clientName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, businessName: true, logo: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ quotations });
}

// ─── POST /api/quotations ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = quotationCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  // Auto-generate quotation number if not provided
  const quotationNumber =
    data.quotationNumber?.trim() || (await generateQuotationNumber(ctx.businessId));

  // Compute item amounts + totals
  const enrichedItems = enrichItems(data.items);
  const additionalChargesTotal = (data.additionalCharges ?? []).reduce(
    (s, c) => s + (c.amount || 0),
    0,
  );
  const totals = calcTotals({
    items: data.items,
    discountAmount: data.discountAmount,
    additionalCharges: additionalChargesTotal,
  });

  try {
    const quotation = await prisma.quotation.create({
      data: {
        businessId: ctx.businessId,
        quotationNumber,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
        validTillDate: data.validTillDate ? new Date(data.validTillDate) : null,
        subtitle: data.subtitle || null,
        logo: data.logo || null,
        currency: data.currency || "AED",

        fromName: data.fromName || null,
        fromAddress: data.fromAddress || null,
        fromGstin: data.fromGstin || null,
        fromPan: data.fromPan || null,

        clientId: data.clientId || null,
        clientName: data.clientName || null,
        clientAddress: data.clientAddress || null,
        clientGstin: data.clientGstin || null,

        shipFromWarehouseId: data.shipFromWarehouseId || null,
        shippingName: data.shippingName || null,
        shippingAddress: data.shippingAddress || null,
        shippingPostalCode: data.shippingPostalCode || null,
        shippingState: data.shippingState || null,
        transporterName: data.transporterName || null,
        distance: data.distance || null,
        vehicleType: data.vehicleType || null,
        vehicleNumber: data.vehicleNumber || null,
        transportDocNumber: data.transportDocNumber || null,
        transactionType: data.transactionType || null,

        discountLabel: data.discountLabel || null,
        discountAmount: data.discountAmount ?? 0,
        additionalCharges: data.additionalCharges ?? [],

        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        totalDiscount: totals.totalDiscount,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount,
        amountInWords: numberToWords(totals.totalAmount, data.currency || "AED"),

        termsAndConditions: data.termsAndConditions || null,
        notes: data.notes || null,
        signature: data.signature || null,
        additionalInfo: data.additionalInfo || null,
        contactDetails: data.contactDetails || null,
        attachments: data.attachments ?? [],
        customFields: data.customFields ?? [],
        settings: data.settings ?? {},

        status: data.status ?? "DRAFT",

        items: {
          create: enrichedItems.map((item, idx) => ({
            productId: item.productId || null,
            name: item.name,
            sku: item.sku || null,
            hsnSac: item.hsnSac || null,
            unit: item.unit || null,
            description: item.description || null,
            image: item.image || null,
            groupName: item.groupName || null,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            amount: item.amount,
            total: item.total,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (err: unknown) {
    console.error("[quotations:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
