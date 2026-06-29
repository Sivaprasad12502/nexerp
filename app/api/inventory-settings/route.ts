import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { inventorySettingsPatchSchema } from "@/lib/validations/inventory-settings";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { manageInventory: true, enableMultipleWarehouses: true },
  });

  const warehouseCount = await prisma.warehouse.count({
    where: { businessId: ctx.businessId },
  });

  return NextResponse.json({
    manageInventory: business?.manageInventory ?? false,
    enableMultipleWarehouses: business?.enableMultipleWarehouses ?? false,
    warehouseCount,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = inventorySettingsPatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  // Prevent disabling multi-warehouse once enabled
  if (data.enableMultipleWarehouses === false) {
    const business = await prisma.business.findUnique({
      where: { id: ctx.businessId },
      select: { enableMultipleWarehouses: true },
    });
    if (business?.enableMultipleWarehouses === true) {
      return NextResponse.json(
        { error: "Multiple warehouses cannot be disabled once enabled." },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ...(data.manageInventory !== undefined && { manageInventory: data.manageInventory }),
      ...(data.enableMultipleWarehouses !== undefined && {
        enableMultipleWarehouses: data.enableMultipleWarehouses,
      }),
    },
    select: { manageInventory: true, enableMultipleWarehouses: true },
  });

  const warehouseCount = await prisma.warehouse.count({
    where: { businessId: ctx.businessId },
  });

  return NextResponse.json({ ...updated, warehouseCount });
}
