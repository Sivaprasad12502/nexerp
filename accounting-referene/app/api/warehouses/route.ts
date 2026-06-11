import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { warehouseCreateSchema } from "@/lib/validations/warehouse";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const warehouses = await prisma.warehouse.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { stockLevels: true } },
    },
  });

  return NextResponse.json({ warehouses });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { manageInventory: true, enableMultipleWarehouses: true },
  });

  if (!business?.manageInventory) {
    return NextResponse.json(
      { error: "Enable 'Manage Inventory' in Business Settings → Inventory to add warehouses." },
      { status: 400 }
    );
  }

  if (!business.enableMultipleWarehouses) {
    const existing = await prisma.warehouse.count({ where: { businessId: ctx.businessId } });
    if (existing >= 1) {
      return NextResponse.json(
        { error: "Enable 'Multiple Warehouses' in Business Settings → Inventory to add more warehouses." },
        { status: 400 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const result = warehouseCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  // Generate warehouse code (WH0001, WH0002…)
  const totalCount = await prisma.warehouse.count({ where: { businessId: ctx.businessId } });
  const warehouseCode = `WH${String(totalCount + 1).padStart(4, "0")}`;

  const shouldBeDefault = data.isDefault || totalCount === 0;

  if (shouldBeDefault) {
    await prisma.warehouse.updateMany({
      where: { businessId: ctx.businessId },
      data: { isDefault: false },
    });
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      businessId: ctx.businessId,
      name: data.name,
      warehouseCode,
      location: data.location || null,
      contactInfo: data.contactInfo || null,
      notes: data.notes || null,
      isDefault: shouldBeDefault,
      warehouseStatus: data.warehouseStatus ?? "ACTIVE",
      vatNumber: data.vatNumber || null,
    },
  });

  return NextResponse.json({ warehouse }, { status: 201 });
}
