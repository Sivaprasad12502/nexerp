import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { stockAdjustmentSchema } from "@/lib/validations/stock-adjustment";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = stockAdjustmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  // Verify warehouse belongs to this business
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: data.warehouseId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  const adjustment = await prisma.$transaction(async (tx) => {
    const current = await tx.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId: data.warehouseId } },
    });

    const currentQty = current?.quantity ?? 0;
    const newQty =
      data.type === "INCOMING"
        ? currentQty + data.quantity
        : Math.max(0, currentQty - data.quantity);

    await tx.warehouseStock.upsert({
      where: { productId_warehouseId: { productId, warehouseId: data.warehouseId } },
      update: { quantity: newQty },
      create: { productId, warehouseId: data.warehouseId, quantity: newQty },
    });

    return tx.stockAdjustment.create({
      data: {
        businessId: ctx.businessId,
        productId,
        warehouseId: data.warehouseId,
        type: data.type,
        quantity: data.quantity,
        rate: data.rate ?? null,
        adjustedValue: data.adjustedValue ?? null,
        vendor: data.vendor || null,
        reason: data.reason,
        notes: data.notes || null,
      },
      include: { warehouse: { select: { id: true, name: true } } },
    });
  });

  return NextResponse.json({ adjustment }, { status: 201 });
}
