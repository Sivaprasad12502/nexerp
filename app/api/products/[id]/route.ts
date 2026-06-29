import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { productCreateSchema } from "@/lib/validations/product";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = productCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      stockLevels: { include: { warehouse: { select: { id: true, name: true } } } },
      adjustments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { warehouse: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.itemType !== undefined && { itemType: data.itemType }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku || null }),
      ...(data.category !== undefined && { category: data.category || null }),
      ...(data.unit !== undefined && { unit: data.unit || null }),
      ...(data.hsnSac !== undefined && { hsnSac: data.hsnSac || null }),
      ...(data.canBeSold !== undefined && { canBeSold: data.canBeSold }),
      ...(data.manageStock !== undefined && { manageStock: data.manageStock }),
      ...(data.image !== undefined && { image: data.image || null }),
      ...(data.originalImage !== undefined && { originalImage: data.originalImage || null }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.purchaseLedger !== undefined && { purchaseLedger: data.purchaseLedger || null }),
      ...(data.salesLedger !== undefined && { salesLedger: data.salesLedger || null }),
      ...(data.inventoryLedger !== undefined && { inventoryLedger: data.inventoryLedger || null }),
      ...(data.currency !== undefined && { currency: data.currency || null }),
      ...(data.buyingPrice !== undefined && { buyingPrice: data.buyingPrice ?? null }),
      ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice ?? null }),
      ...(data.landedCost !== undefined && { landedCost: data.landedCost ?? null }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate ?? null }),
      ...(data.priceInclusiveTax !== undefined && { priceInclusiveTax: data.priceInclusiveTax }),
      ...(data.length !== undefined && { length: data.length ?? null }),
      ...(data.breadth !== undefined && { breadth: data.breadth ?? null }),
      ...(data.height !== undefined && { height: data.height ?? null }),
      ...(data.grossWeight !== undefined && { grossWeight: data.grossWeight ?? null }),
      ...(data.netWeight !== undefined && { netWeight: data.netWeight ?? null }),
      ...(data.trackingMethod !== undefined && { trackingMethod: data.trackingMethod }),
      ...(data.reorderPoint !== undefined && { reorderPoint: data.reorderPoint ?? null }),
      ...(data.overstockPoint !== undefined && { overstockPoint: data.overstockPoint ?? null }),
    },
    include: {
      stockLevels: { include: { warehouse: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });

  return NextResponse.json({ message: "Product archived" });
}
