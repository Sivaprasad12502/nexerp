"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Search, Eye, Pencil, MoreHorizontal, TrendingUp } from "lucide-react";
import { ViewItemDrawer } from "@/components/inventory/view-item-drawer";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WarehouseRow = {
  id: string;
  name: string;
  warehouseCode?: string | null;
};

type StockLevel = {
  warehouseId: string;
  quantity: number;
  committed: number;
  warehouse: { id: string; name: string };
};

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  itemType: "PRODUCT" | "SERVICE";
  trackingMethod: string;
  reorderPoint?: number | null;
  overstockPoint?: number | null;
  stockLevels: StockLevel[];
};

function stockStatusBadge(qty: number, reorder?: number | null, overstock?: number | null) {
  if (reorder != null && qty <= reorder) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600 ring-1 ring-orange-200">
        Low Stock
      </span>
    );
  }
  if (overstock != null && qty >= overstock) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
        Overstock
      </span>
    );
  }
  if (qty === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">
        Out of Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
      In Stock
    </span>
  );
}

export default function WarehousePage() {
  const qc = useQueryClient();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);

  const { data: warehouseData, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async (): Promise<{ warehouses: WarehouseRow[] }> => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "ACTIVE"],
    queryFn: async (): Promise<{ products: ProductRow[] }> => {
      const res = await fetch("/api/products?status=ACTIVE");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const warehouses = warehouseData?.warehouses ?? [];
  const allProducts = productsData?.products ?? [];

  // Initialize selected warehouse when warehouses load
  if (warehouses.length > 0 && !selectedWarehouseId) {
    setSelectedWarehouseId(warehouses[0].id);
  }

  // Filter products that have stock in selected warehouse
  const warehouseProducts = allProducts
    .map((p) => {
      const level = p.stockLevels.find((sl) => sl.warehouseId === selectedWarehouseId);
      return level ? { ...p, warehouseQty: level.quantity, stockInHand: level.quantity - level.committed } : null;
    })
    .filter(Boolean) as (ProductRow & { warehouseQty: number; stockInHand: number })[];

  const filtered = warehouseProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function downloadCSV() {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const headers = ["SKU", "Item Name", "Item Type", "Tracking Method", "Warehouse Stock", "Stock in Hand", "Stock Status", "Reorder Point", "Overstock Point"];
    const rows = filtered.map((p) => [
      p.sku ?? "",
      p.name,
      p.itemType,
      p.trackingMethod,
      p.warehouseQty,
      p.stockInHand,
      p.reorderPoint != null && p.warehouseQty <= p.reorderPoint ? "Low Stock" : p.overstockPoint != null && p.warehouseQty >= p.overstockPoint ? "Overstock" : p.warehouseQty === 0 ? "Out of Stock" : "In Stock",
      p.reorderPoint ?? "",
      p.overstockPoint ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isLoading = warehousesLoading || productsLoading;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Inventory Items in Warehouses</h1>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Warehouse selector */}
        <div className="relative">
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            disabled={warehouses.length === 0}
            className="min-w-[180px] appearance-none rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-zinc-800 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9] disabled:opacity-50"
          >
            {warehouses.length === 0 ? (
              <option value="">No warehouses</option>
            ) : (
              warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))
            )}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Download CSV */}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="size-4" />
            Download CSV
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              className="w-44 rounded-md border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            />
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              →
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-6 text-center text-sm text-amber-700">
          No warehouses configured. Go to{" "}
          <a href="/business-settings/inventory" className="underline">
            Business Settings → Inventory
          </a>{" "}
          to add warehouses.
        </div>
      ) : (
        <>
          {/* Count + Show/Hide columns */}
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Showing <strong className="text-zinc-800">1</strong> to{" "}
              <strong className="text-zinc-800">{filtered.length}</strong> of{" "}
              <strong className="text-zinc-800">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "item" : "items"}
            </span>
            <button className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
              <svg className="size-3.5" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Show/Hide Columns
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="w-8 px-4 py-3">
                      <input type="checkbox" className="rounded border-zinc-300" />
                    </th>
                    {[
                      "SKU",
                      "Item Name",
                      "Item Type",
                      "Tracking Method",
                      "Warehouse Stock",
                      "Stock in Hand",
                      "Stock Status",
                      "Reorder Point",
                      "Overstock Point",
                    ].map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-medium text-zinc-500">
                        <span className="flex items-center gap-1">
                          {col}
                          {["SKU", "Item Name", "Item Type", "Tracking Method", "Warehouse Stock", "Stock in Hand", "Reorder Point"].includes(col) && (
                            <svg className="size-3 text-zinc-400" viewBox="0 0 12 12" fill="none">
                              <path d="M6 2v8M3 5l3-3 3 3M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-sm text-zinc-400">
                        {search ? "No items match your search." : "No items in this warehouse yet."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-zinc-300" />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600">{p.sku || "—"}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.itemType}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.trackingMethod}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900">{p.warehouseQty}</td>
                        <td className="px-4 py-3 font-medium text-zinc-900">{p.stockInHand}</td>
                        <td className="px-4 py-3">
                          {stockStatusBadge(p.warehouseQty, p.reorderPoint, p.overstockPoint)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{p.reorderPoint ?? "—"}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.overstockPoint ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* View */}
                            <button
                              onClick={() => setViewingProductId(p.id)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                            >
                              <Eye className="size-3.5" />
                              View
                            </button>
                            {/* Adjust Stock */}
                            <button
                              onClick={() => setAdjustingProduct(p)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                            >
                              <Pencil className="size-3.5" />
                              Adjust Stock
                            </button>
                            {/* More */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="rounded px-2 py-1 hover:bg-zinc-100">
                                  <MoreHorizontal className="size-4 text-zinc-400" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingProductId(p.id)}>
                                  <Eye className="mr-2 size-4" />
                                  Quick View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAdjustingProduct(p)}>
                                  <TrendingUp className="mr-2 size-4" />
                                  Adjust Stock
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom count + Show/Hide */}
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Showing <strong className="text-zinc-800">1</strong> to{" "}
              <strong className="text-zinc-800">{filtered.length}</strong> of{" "}
              <strong className="text-zinc-800">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "item" : "items"}
            </span>
            <button className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
              <svg className="size-3.5" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Show/Hide Columns
            </button>
          </div>
        </>
      )}

      {/* Drawers */}
      <ViewItemDrawer
        open={!!viewingProductId}
        onClose={() => setViewingProductId(null)}
        productId={viewingProductId}
      />

      {adjustingProduct && (
        <AdjustStockModal
          open={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          productId={adjustingProduct.id}
          productName={adjustingProduct.name}
          warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        />
      )}
    </div>
  );
}
