"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Package, Warehouse, TrendingDown, TrendingUp } from "lucide-react";

type StockLevel = { warehouseId: string; quantity: number; committed: number; warehouse: { id: string; name: string } };
type Adjustment = {
  id: string;
  type: "INCOMING" | "OUTGOING";
  quantity: number;
  rate?: number | null;
  reason: string;
  vendor?: string | null;
  notes?: string | null;
  createdAt: string;
  warehouse: { id: string; name: string };
};
type Product = {
  id: string;
  name: string;
  sku?: string | null;
  itemType: string;
  category?: string | null;
  unit?: string | null;
  hsnSac?: string | null;
  buyingPrice?: number | null;
  sellingPrice?: number | null;
  taxRate?: number | null;
  trackingMethod: string;
  reorderPoint?: number | null;
  overstockPoint?: number | null;
  description?: string | null;
  tags: string[];
  stockLevels: StockLevel[];
  adjustments: Adjustment[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string | null;
};

export function ViewItemDrawer({ open, onClose, productId }: Props) {
  const [tab, setTab] = useState<"overview" | "transactions">("overview");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const { data, isLoading } = useQuery<{ product: Product }>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Failed to load product");
      return res.json();
    },
    enabled: open && !!productId,
  });

  if (!open) return null;

  const product = data?.product;
  const totalStock = product?.stockLevels.reduce((s, l) => s + l.quantity, 0) ?? 0;
  const committedStock = product?.stockLevels.reduce((s, l) => s + l.committed, 0) ?? 0;

  function stockStatus() {
    if (!product) return null;
    if (product.reorderPoint != null && totalStock <= product.reorderPoint) {
      return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Low Stock</span>;
    }
    if (product.overstockPoint != null && totalStock >= product.overstockPoint) {
      return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">Overstock</span>;
    }
    return <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">In Stock</span>;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#f3effc]">
              <Package className="size-5 text-[#6d28d9]" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">{product?.name ?? "Loading…"}</p>
              {product?.sku && <p className="text-xs text-zinc-400">SKU: {product.sku}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-zinc-100">
            <X className="size-5 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-6">
          {(["overview", "transactions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 py-3 text-sm capitalize transition-colors ${
                tab === t
                  ? "border-[#6d28d9] font-medium text-[#6d28d9]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              } mr-6`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
          )}

          {product && tab === "overview" && (
            <div className="space-y-6">
              {/* Stock overview */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Stock Overview</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Stock", value: totalStock },
                    { label: "Committed", value: committedStock },
                    { label: "Available", value: Math.max(0, totalStock - committedStock) },
                    { label: "Reorder Point", value: product.reorderPoint ?? "—" },
                    { label: "Overstock Point", value: product.overstockPoint ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-zinc-50 px-4 py-3">
                      <p className="text-xs text-zinc-400">{item.label}</p>
                      <p className="mt-0.5 text-lg font-semibold text-zinc-900">{item.value}</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-zinc-50 px-4 py-3">
                    <p className="text-xs text-zinc-400">Status</p>
                    <div className="mt-1">{stockStatus()}</div>
                  </div>
                </div>
              </div>

              {/* Per-warehouse breakdown */}
              {product.stockLevels.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Warehouse Breakdown
                  </p>
                  <div className="overflow-hidden rounded-lg border border-zinc-100">
                    {product.stockLevels.map((sl) => (
                      <div
                        key={sl.warehouseId}
                        className="flex items-center justify-between border-b border-zinc-50 px-4 py-2.5 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Warehouse className="size-4 text-zinc-400" />
                          <span className="text-sm text-zinc-700">{sl.warehouse.name}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{sl.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product info */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Product Details</p>
                <dl className="space-y-2 text-sm">
                  {[
                    { label: "Type", value: product.itemType },
                    { label: "Category", value: product.category },
                    { label: "Unit", value: product.unit },
                    { label: "HSN/SAC", value: product.hsnSac },
                    { label: "Buying Price", value: product.buyingPrice != null ? product.buyingPrice : null },
                    { label: "Selling Price", value: product.sellingPrice != null ? product.sellingPrice : null },
                    { label: "Tax Rate", value: product.taxRate != null ? `${product.taxRate}%` : null },
                    { label: "Tracking", value: product.trackingMethod },
                  ]
                    .filter((f) => f.value != null)
                    .map((f) => (
                      <div key={f.label} className="flex justify-between gap-4">
                        <dt className="text-zinc-400">{f.label}</dt>
                        <dd className="text-right font-medium text-zinc-800">{String(f.value)}</dd>
                      </div>
                    ))}
                </dl>
              </div>

              {product.tags.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((t) => (
                      <span key={t} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {product && tab === "transactions" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Recent Adjustments
              </p>
              {product.adjustments.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-400">No adjustments yet.</p>
              )}
              {product.adjustments.map((adj) => (
                <div key={adj.id} className="rounded-lg border border-zinc-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {adj.type === "INCOMING" ? (
                        <TrendingUp className="size-4 text-green-500" />
                      ) : (
                        <TrendingDown className="size-4 text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${adj.type === "INCOMING" ? "text-green-700" : "text-red-600"}`}>
                        {adj.type === "INCOMING" ? "+" : "-"}{adj.quantity}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(adj.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {adj.reason} · {adj.warehouse.name}
                    {adj.vendor ? ` · ${adj.vendor}` : ""}
                  </p>
                  {adj.notes && <p className="mt-0.5 text-xs text-zinc-400 italic">{adj.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
