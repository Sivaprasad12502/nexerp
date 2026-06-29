import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { productCreateSchema } from "@/lib/validations/product";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "ACTIVE";
  const validStatuses = ["ACTIVE", "ARCHIVED"];
  const resolvedStatus = validStatuses.includes(status.toUpperCase())
    ? (status.toUpperCase() as "ACTIVE" | "ARCHIVED")
    : "ACTIVE";

  const products = await prisma.product.findMany({
    where: { businessId: ctx.businessId, status: resolvedStatus },
    orderBy: { createdAt: "desc" },
    include: {
      stockLevels: {
        include: {
          warehouse: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure at least one warehouse exists
  const warehouseCount = await prisma.warehouse.count({ where: { businessId: ctx.businessId } });
  if (warehouseCount === 0) {
    return NextResponse.json(
      { error: "Add at least one warehouse before creating products." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const result = productCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { initialStock, initialWarehouseId, ...data } = result.data;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        businessId: ctx.businessId,
        itemType: data.itemType,
        name: data.name,
        sku: data.sku || null,
        category: data.category || null,
        unit: data.unit || null,
        hsnSac: data.hsnSac || null,
        canBeSold: data.canBeSold,
        manageStock: data.manageStock,
        image: data.image || null,
        originalImage: data.originalImage || null,
        description: data.description || null,
        tags: data.tags ?? [],
        purchaseLedger: data.purchaseLedger || null,
        salesLedger: data.salesLedger || null,
        inventoryLedger: data.inventoryLedger || null,
        currency: data.currency || null,
        buyingPrice: data.buyingPrice ?? null,
        sellingPrice: data.sellingPrice ?? null,
        landedCost: data.landedCost ?? null,
        taxRate: data.taxRate ?? null,
        priceInclusiveTax: data.priceInclusiveTax,
        length: data.length ?? null,
        breadth: data.breadth ?? null,
        height: data.height ?? null,
        grossWeight: data.grossWeight ?? null,
        netWeight: data.netWeight ?? null,
        trackingMethod: data.trackingMethod,
        reorderPoint: data.reorderPoint ?? null,
        overstockPoint: data.overstockPoint ?? null,
      },
    });

    if (initialStock && initialStock > 0 && initialWarehouseId) {
      await tx.warehouseStock.upsert({
        where: { productId_warehouseId: { productId: created.id, warehouseId: initialWarehouseId } },
        update: { quantity: { increment: initialStock } },
        create: { productId: created.id, warehouseId: initialWarehouseId, quantity: initialStock },
      });

      await tx.stockAdjustment.create({
        data: {
          businessId: ctx.businessId,
          productId: created.id,
          warehouseId: initialWarehouseId,
          type: "INCOMING",
          quantity: initialStock,
          reason: "Purchase",
          notes: "Opening stock",
        },
      });
    }

    return created;
  });

  const full = await prisma.product.findUnique({
    where: { id: product.id },
    include: { stockLevels: { include: { warehouse: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({ product: full }, { status: 201 });
}
