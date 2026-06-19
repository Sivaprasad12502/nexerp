/**
 * Inventory Stock Helpers
 *
 * Transaction-aware utilities for incrementing (purchases) and decrementing
 * (sales/invoices) WarehouseStock.  Every function receives a Prisma
 * transaction client (`tx`) so it runs atomically with the document that
 * triggered the movement.
 *
 * Pattern mirrors app/api/products/[id]/adjust-stock/route.ts.
 */

import type { Prisma } from "@/app/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Subset of DocumentItem fields needed to update stock. */
export type StockItem = {
  productId: string | null;
  name: string;
  quantity: number;
  rate: number;
  total: number;
};

type TxClient = Prisma.TransactionClient;

// ─── Error ────────────────────────────────────────────────────────────────────

/** Thrown (inside a transaction) when available stock is insufficient. */
export class InsufficientStockError extends Error {
  constructor(itemName: string, available: number) {
    super(
      `Insufficient stock for "${itemName}". Available: ${available}`,
    );
    this.name = "InsufficientStockError";
  }
}

// ─── Warehouse resolution ─────────────────────────────────────────────────────

/**
 * Resolves which warehouse to use for a stock movement.
 *
 * Priority:
 *   1. `shipFromWarehouseId` if explicitly provided on the document.
 *   2. The business's default warehouse (`isDefault = true`).
 *   3. The only active warehouse if exactly one exists.
 *   4. `null` — caller must skip stock update.
 */
export async function resolveWarehouseId(
  tx: TxClient,
  businessId: string,
  shipFromWarehouseId?: string | null,
): Promise<string | null> {
  if (shipFromWarehouseId) return shipFromWarehouseId;

  // Try default warehouse first
  const defaultWarehouse = await tx.warehouse.findFirst({
    where: { businessId, isDefault: true, warehouseStatus: "ACTIVE" },
    select: { id: true },
  });
  if (defaultWarehouse) return defaultWarehouse.id;

  // Fall back to the single warehouse if there is exactly one
  const warehouses = await tx.warehouse.findMany({
    where: { businessId, warehouseStatus: "ACTIVE" },
    select: { id: true },
  });
  if (warehouses.length === 1) return warehouses[0].id;

  return null;
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

type ApplyStockArgs = {
  tx: TxClient;
  businessId: string;
  warehouseId: string;
  items: StockItem[];
  reason: string; // e.g. "Purchase INV-0001" or "Invoice INV-0002"
};

/**
 * Increments stock for each inventory product in `items`.
 * Skips items with no `productId`, services, and items with `manageStock = false`.
 * Creates an INCOMING StockAdjustment row for each movement.
 */
export async function applyIncomingStock({
  tx,
  businessId,
  warehouseId,
  items,
  reason,
}: ApplyStockArgs): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue;

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { itemType: true, manageStock: true },
    });

    if (!product || product.itemType !== "PRODUCT" || !product.manageStock) {
      continue;
    }

    await tx.warehouseStock.upsert({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId,
        },
      },
      update: { quantity: { increment: item.quantity } },
      create: {
        productId: item.productId,
        warehouseId,
        quantity: item.quantity,
      },
    });

    await tx.stockAdjustment.create({
      data: {
        businessId,
        productId: item.productId,
        warehouseId,
        type: "INCOMING",
        quantity: item.quantity,
        rate: item.rate,
        adjustedValue: item.total,
        reason,
      },
    });
  }
}

/**
 * Decrements stock for each inventory product in `items`.
 * Skips items with no `productId`, services, and items with `manageStock = false`.
 * Throws `InsufficientStockError` (rolling back the enclosing transaction) if
 * a product has no stock record or fewer units than requested.
 * Creates an OUTGOING StockAdjustment row for each movement.
 */
export async function applyOutgoingStock({
  tx,
  businessId,
  warehouseId,
  items,
  reason,
}: ApplyStockArgs): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue;

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { itemType: true, manageStock: true },
    });

    if (!product || product.itemType !== "PRODUCT" || !product.manageStock) {
      continue;
    }

    const stock = await tx.warehouseStock.findUnique({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId,
        },
      },
    });

    const available = stock?.quantity ?? 0;
    if (available < item.quantity) {
      throw new InsufficientStockError(item.name, available);
    }

    await tx.warehouseStock.update({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId,
        },
      },
      data: { quantity: { decrement: item.quantity } },
    });

    await tx.stockAdjustment.create({
      data: {
        businessId,
        productId: item.productId,
        warehouseId,
        type: "OUTGOING",
        quantity: item.quantity,
        rate: item.rate,
        adjustedValue: item.total,
        reason,
      },
    });
  }
}
