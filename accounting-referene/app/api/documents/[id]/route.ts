import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { documentUpdateSchema, type DocumentUpdateInput } from "@/lib/validations/document";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";
import type { QuotationItemInput } from "@/lib/validations/quotation";

type RouteCtx = { params: Promise<{ id: string }> };

function enrichItems(items: QuotationItemInput[]) {
  return items.map((item) => {
    const { amount, taxAmount, total } = calcItem(item);
    return { ...item, amount, taxAmount, total };
  });
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: {
        select: {
          id:          true,
          businessName: true,
          logo:         true,
          email:        true,
          phone:        true,
          streetAddress: true,
          addressCity:  true,
          state:        true,
          addressCountry: true,
          trn:          true,
          vatNumber:    true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const result = documentUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data as DocumentUpdateInput;
  const additionalChargesTotal = (data.additionalCharges ?? []).reduce(
    (s, c) => s + (c.amount || 0),
    0,
  );
  const enrichedItems = data.items ? enrichItems(data.items) : undefined;
  const totals = data.items
    ? calcTotals({
        items: data.items,
        discountAmount: data.discountAmount,
        additionalCharges: additionalChargesTotal,
      })
    : null;

  try {
    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title || null }),
        ...(data.documentNumber !== undefined && {
          documentNumber: data.documentNumber || existing.documentNumber,
        }),
        ...(data.documentDate !== undefined && {
          documentDate: data.documentDate ? new Date(data.documentDate) : existing.documentDate,
        }),
        ...(data.validTillDate !== undefined && {
          validTillDate: data.validTillDate ? new Date(data.validTillDate) : null,
        }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle || null }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.fromName !== undefined && { fromName: data.fromName || null }),
        ...(data.fromAddress !== undefined && { fromAddress: data.fromAddress || null }),
        ...(data.fromGstin !== undefined && { fromGstin: data.fromGstin || null }),
        ...(data.fromPan !== undefined && { fromPan: data.fromPan || null }),
        ...(data.clientName !== undefined && { clientName: data.clientName || null }),
        ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress || null }),
        ...(data.clientGstin !== undefined && { clientGstin: data.clientGstin || null }),
        ...(data.discountLabel !== undefined && { discountLabel: data.discountLabel || null }),
        ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
        ...(data.additionalCharges !== undefined && { additionalCharges: data.additionalCharges }),
        ...(totals && {
          subTotal: totals.subTotal,
          totalTax: totals.totalTax,
          totalDiscount: totals.totalDiscount,
          totalQuantity: totals.totalQuantity,
          totalAmount: totals.totalAmount,
          amountInWords: numberToWords(totals.totalAmount, data.currency || existing.currency),
        }),
        ...(data.termsAndConditions !== undefined && {
          termsAndConditions: data.termsAndConditions || null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.signature !== undefined && { signature: data.signature || null }),
        ...(data.additionalInfo !== undefined && { additionalInfo: data.additionalInfo || null }),
        ...(data.contactDetails !== undefined && { contactDetails: data.contactDetails || null }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.customFields !== undefined && { customFields: data.customFields }),
        ...(data.settings !== undefined && { settings: data.settings }),
        ...(data.status !== undefined && { status: data.status }),
        ...(enrichedItems && {
          items: {
            deleteMany: {},
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
        }),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true, email: true } },
      },
    });

    return NextResponse.json({ document });
  } catch (err: unknown) {
    console.error("[documents:PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.purchasedAt) {
    return NextResponse.json(
      { error: "Cannot delete a purchase order that has been converted to a purchase" },
      { status: 409 },
    );
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
