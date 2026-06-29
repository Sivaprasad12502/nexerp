import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { warehouseCreateSchema } from "@/lib/validations/warehouse";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { _count: { select: { stockLevels: true } } },
  });
  if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  return NextResponse.json({ warehouse });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.warehouse.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = warehouseCreateSchema.partial().safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  if (data.isDefault) {
    await prisma.warehouse.updateMany({
      where: { businessId: ctx.businessId },
      data: { isDefault: false },
    });
  }

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.warehouseCode !== undefined && { warehouseCode: data.warehouseCode || null }),
      ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber || null }),
      ...(data.country !== undefined && { country: data.country || null }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
      ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.contactInfo !== undefined && { contactInfo: data.contactInfo || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.warehouseStatus !== undefined && { warehouseStatus: data.warehouseStatus }),
    },
  });

  return NextResponse.json({ warehouse });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.warehouse.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

  const stockTotal = await prisma.warehouseStock.aggregate({
    where: { warehouseId: id },
    _sum: { quantity: true },
  });
  if ((stockTotal._sum.quantity ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a warehouse that still holds stock. Adjust or transfer stock first." },
      { status: 400 }
    );
  }

  await prisma.warehouse.delete({ where: { id } });

  return NextResponse.json({ message: "Warehouse deleted" });
}
