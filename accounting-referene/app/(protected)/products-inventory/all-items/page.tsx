"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Package,
  Eye,
  Pencil,
  AlertTriangle,
  Search,
  Download,
  ChevronDown,
  X,
  ChevronRight,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useInventoryStatus } from "@/lib/hooks/use-inventory-status";
import { ItemForm, type ItemFormData } from "@/components/inventory/item-form";
import { ViewItemDrawer } from "@/components/inventory/view-item-drawer";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import type { ProductCreateInput } from "@/lib/validations/product";

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
  category?: string | null;
  unit?: string | null;
  hsnSac?: string | null;
  canBeSold?: boolean;
  manageStock?: boolean;
  image?: string | null;
  originalImage?: string | null;
  description?: string | null;
  tags: string[];
  purchaseLedger?: string | null;
  salesLedger?: string | null;
  inventoryLedger?: string | null;
  currency?: string | null;
  buyingPrice?: number | null;
  sellingPrice?: number | null;
  landedCost?: number | null;
  taxRate?: number | null;
  priceInclusiveTax?: boolean;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  grossWeight?: number | null;
  netWeight?: number | null;
  trackingMethod?: "NONE" | "BATCHWISE" | "SERIAL" | "BATCH_SERIAL";
  reorderPoint?: number | null;
  overstockPoint?: number | null;
  status: "ACTIVE" | "ARCHIVED";
  stockLevels: StockLevel[];
};

type WarehouseRow = { id: string; name: string };
type TabStatus = "ACTIVE" | "ARCHIVED";
type InventoryFilter = "all" | "managed" | "unmanaged";

function stockBadge(product: ProductRow) {
  const total = product.stockLevels.reduce((s, l) => s + l.quantity, 0);
  if (product.reorderPoint != null && total <= product.reorderPoint)
    return { label: "Low Stock", cls: "bg-orange-50 text-orange-600 ring-1 ring-orange-200" };
  if (product.overstockPoint != null && total >= product.overstockPoint)
    return { label: "Overstock", cls: "bg-blue-50 text-blue-600 ring-1 ring-blue-200" };
  if (total === 0)
    return { label: "Out of Stock", cls: "bg-zinc-100 text-zinc-500" };
  return { label: "In Stock", cls: "bg-green-50 text-green-700 ring-1 ring-green-200" };
}

function formatItemType(itemType: "PRODUCT" | "SERVICE") {
  return itemType === "PRODUCT" ? "Product" : "Service";
}

function formatPrice(currency: string | null | undefined, amount: number | null | undefined) {
  if (amount == null) return "—";
  const cur = currency ?? "AED";
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${cur} ${value}`;
}

function TableFilterIcon() {
  return (
    <svg className="size-3 shrink-0 text-zinc-400" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1.5 2.5h9M3 6h6M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TableSortIcon() {
  return (
    <svg className="size-3 shrink-0 text-zinc-400" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 1.5v9M3.5 4.5L6 2l2.5 2.5M3.5 7.5L6 10l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShowHideColumnsButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
    >
      <svg className="size-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      Show/Hide Columns
    </button>
  );
}

export default function AllItemsPage() {
  const qc = useQueryClient();
  const { manageInventory, warehouseCount, isLoading: statusLoading } = useInventoryStatus();

  const activeTab: TabStatus = "ACTIVE";
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("managed");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const canAdd = manageInventory && warehouseCount > 0;

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", activeTab],
    queryFn: async (): Promise<{ products: ProductRow[] }> => {
      const res = await fetch(`/api/products?status=${activeTab}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async (): Promise<{ warehouses: WarehouseRow[] }> => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to load warehouses");
      return res.json();
    },
    enabled: manageInventory,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: ProductCreateInput; id?: string }) => {
      const url = id ? `/api/products/${id}` : "/api/products";
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      return body;
    },
    onSuccess: () => {
      toast.success(editingProduct ? "Item updated" : "Item created");
      qc.invalidateQueries({ queryKey: ["products"] });
      setIsCreating(false);
      setEditingProduct(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const products = productsData?.products ?? [];
  const warehouses = warehousesData?.warehouses ?? [];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      inventoryFilter === "all" ||
      (inventoryFilter === "managed" && p.manageStock) ||
      (inventoryFilter === "unmanaged" && !p.manageStock);
    return matchesSearch && matchesFilter;
  });

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave(data: ProductCreateInput) {
    await saveMutation.mutateAsync({ data, id: editingProduct?.id });
  }

  function downloadCSV() {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const headers = ["SKU", "Item Name", "Item Type", "Buying Price", "Selling Price", "Landed Cost", "Tax %", "Total Stock", "Unit"];
    const rows = filtered.map((p) => [
      p.sku ?? "",
      p.name,
      p.itemType,
      p.buyingPrice ?? "",
      p.sellingPrice ?? "",
      p.landedCost ?? "",
      p.taxRate ?? "",
      p.stockLevels.reduce((s, l) => s + l.quantity, 0),
      p.unit ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  if (isCreating || editingProduct) {
    return (
      <div className="space-y-4">
        <div className="p-4">
          <h1 className="text-xl font-semibold text-zinc-900">
            {editingProduct?.id ? "Edit Item" : "New Item"}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {editingProduct?.id
              ? "Update product details."
              : "Add a new product or service to your inventory."}
          </p>
        </div>
        <ItemForm
          initialData={editingProduct as unknown as ItemFormData}
          warehouses={warehouses}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditingProduct(null);
          }}
        />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Page header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-0 pt-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          uaeorganisation <span className="mx-0.5">&gt;</span> Inventory{" "}
          <span className="mx-0.5">&gt;</span>
        </nav>

        <div className="mt-1 flex items-start justify-between gap-4 pb-4">
          <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
            Inventory
            <span className="text-[22px] leading-none" aria-hidden>
              💡
            </span>
          </h1>

          {/* Add Item split button */}
          <div className="flex shrink-0 items-stretch overflow-hidden rounded-md">
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingProduct(null);
              }}
              disabled={!canAdd}
              title={
                !manageInventory
                  ? "Enable Manage Inventory in settings first"
                  : warehouseCount === 0
                    ? "Add a warehouse first"
                    : undefined
              }
              className="flex items-center gap-2 bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              Add Item
            </button>
            <button
              disabled={!canAdd}
              className="flex items-center border-l border-[#c4177a]/60 bg-[#e91e8c] px-2.5 py-2 text-white hover:bg-[#c4177a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0">
          <Link
            href="/products-inventory/all-items"
            className="border-b-2 border-[#6d28d9] px-0.5 pb-3 text-sm font-semibold text-[#6d28d9]"
          >
            All Items
          </Link>
          <Link
            href="/products-inventory/warehouse"
            className="ml-6 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-600 hover:text-zinc-800"
          >
            Warehouses
          </Link>
          <button
            type="button"
            className="ml-6 flex items-center gap-0.5 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-600 hover:text-zinc-800"
          >
            Reports &amp; More
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-6 py-5 sm:px-8">
        {/* Gating hint */}
        {(!manageInventory || warehouseCount === 0) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-amber-900">
                  {!manageInventory ? "Inventory tracking is not enabled" : "No warehouse configured yet"}
                </p>
                <ol className="mt-2 space-y-1 text-sm text-amber-700">
                  <li className={`flex items-center gap-2 ${manageInventory ? "line-through opacity-60" : ""}`}>
                    <span className={`inline-flex size-5 items-center justify-center rounded-full text-xs font-bold ${manageInventory ? "bg-green-100 text-green-600" : "bg-amber-200 text-amber-800"}`}>1</span>
                    Enable &ldquo;Manage Inventory&rdquo; in{" "}
                    <Link href="/business-settings/inventory" className="underline">Business Settings → Inventory</Link>
                  </li>
                  <li className={`flex items-center gap-2 ${warehouseCount > 0 ? "line-through opacity-60" : ""}`}>
                    <span className={`inline-flex size-5 items-center justify-center rounded-full text-xs font-bold ${warehouseCount > 0 ? "bg-green-100 text-green-600" : "bg-amber-200 text-amber-800"}`}>2</span>
                    <Link href="/business-settings/inventory" className="underline">Add a warehouse in Business Settings</Link>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">3</span>
                    Add products here
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Section heading */}
        <h2 className="text-base font-semibold text-zinc-900">All Items</h2>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <select
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value as InventoryFilter)}
              className="w-full appearance-none rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-zinc-800 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            >
              <option value="managed">Managed Inventory</option>
              <option value="unmanaged">Unmanaged Inventory</option>
              <option value="all">All Inventory</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadCSV}
              className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Download className="size-4 text-zinc-500" />
              Download CSV
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items"
                className="w-52 rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
              />
              <ArrowRight className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1 text-sm font-semibold text-zinc-800"
            >
              <ChevronDown
                className={`size-4 transition-transform ${filtersOpen ? "" : "-rotate-90"}`}
              />
              Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setInventoryFilter("all");
              }}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
            >
              <X className="size-3.5" />
              Clear All Filters
            </button>
          </div>

          {filtersOpen && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Applied Filters</p>
              <div className="flex flex-wrap gap-2">
                {inventoryFilter !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700">
                    <X
                      className="size-3 cursor-pointer text-zinc-400 hover:text-zinc-700"
                      onClick={() => setInventoryFilter("all")}
                    />
                    {inventoryFilter === "managed" ? "Manage Stock: Yes" : "Manage Stock: No"}
                    <ChevronDown className="size-3 text-zinc-400" />
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700">
                    <X
                      className="size-3 cursor-pointer text-zinc-400 hover:text-zinc-700"
                      onClick={() => setSearch("")}
                    />
                    Search: {search}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {(statusLoading || productsLoading) && (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-400">Loading…</div>
        )}

        {!statusLoading && !productsLoading && (
          <>
            {/* Count + Show/Hide Columns */}
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>
                Showing{" "}
                <strong className="font-semibold text-zinc-800">
                  {filtered.length === 0 ? 0 : 1}
                </strong>{" "}
                to{" "}
                <strong className="font-semibold text-zinc-800">{filtered.length}</strong> of{" "}
                <strong className="font-semibold text-zinc-800">{filtered.length}</strong>{" "}
                {filtered.length === 1 ? "item" : "items"}
              </span>
              <ShowHideColumnsButton />
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white py-16 text-center">
                <Package className="mb-3 size-10 text-zinc-300" />
                <p className="font-medium text-zinc-700">
                  {search ? "No items match your search" : "No items yet"}
                </p>
                {!search && canAdd && (
                  <button
                    onClick={() => {
                      setIsCreating(true);
                      setEditingProduct(null);
                    }}
                    className="mt-4 flex items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4177a]"
                  >
                    <Plus className="size-4" />
                    Add First Item
                  </button>
                )}
              </div>
            )}

            {/* Items table */}
            {filtered.length > 0 && (
              <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50">
                      <tr>
                        <th className="w-10 px-3 py-2.5">
                          <input type="checkbox" className="size-3.5 rounded border-zinc-300" />
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Warehouse Details
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            SKU
                            <TableFilterIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Image
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Original Image
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            item
                            <TableFilterIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            Item Type
                            <TableFilterIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            Buying Price
                            <TableSortIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            Selling Price
                            <TableSortIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            Landed Cost
                            <TableSortIcon />
                          </span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Tax %
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Total Stock
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Stock Status
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                          Unit
                        </th>
                        <th className="w-20 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filtered.map((p) => {
                        const totalStock = p.stockLevels.reduce((s, l) => s + l.quantity, 0);
                        const badge = stockBadge(p);
                        const rowExpanded = expandedRows.has(p.id);

                        return (
                          <Fragment key={p.id}>
                            <tr className="bg-white hover:bg-zinc-50/80">
                              <td className="px-3 py-2.5">
                                <input type="checkbox" className="size-3.5 rounded border-zinc-300" />
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleRow(p.id)}
                                  className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-500 hover:bg-zinc-50"
                                >
                                  {rowExpanded ? "−" : "+"}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-zinc-700 whitespace-nowrap">
                                {p.sku || "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt=""
                                    className="size-8 rounded border border-zinc-100 object-cover"
                                  />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded border border-zinc-100 bg-zinc-50">
                                    <Package className="size-3.5 text-zinc-300" />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {p.originalImage ? (
                                  <img
                                    src={p.originalImage}
                                    alt=""
                                    className="size-8 rounded border border-zinc-100 object-cover"
                                  />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded border border-zinc-100 bg-zinc-50">
                                    <Package className="size-3.5 text-zinc-300" />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-800 whitespace-nowrap">{p.name}</td>
                              <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                                {formatItemType(p.itemType)}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                                {formatPrice(p.currency, p.buyingPrice)}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                                {formatPrice(p.currency, p.sellingPrice)}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                                {formatPrice(p.currency, p.landedCost)}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-700">
                                {p.taxRate != null ? `${p.taxRate}%` : "—"}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-zinc-800">{totalStock}</td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-zinc-500">{p.unit || "—"}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingProductId(p.id)}
                                    title="View"
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingProduct(p)}
                                    title="Edit"
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Pencil className="size-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {rowExpanded && (
                              <tr className="bg-zinc-50">
                                <td colSpan={15} className="px-6 py-3">
                                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                      Warehouse Stock Breakdown
                                    </p>
                                    {p.stockLevels.length === 0 ? (
                                      <p className="text-xs text-zinc-400">No warehouse stock allocated.</p>
                                    ) : (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-zinc-400">
                                            <th className="pb-1 text-left font-medium">Warehouse</th>
                                            <th className="pb-1 text-right font-medium">Quantity</th>
                                            <th className="pb-1 text-right font-medium">Committed</th>
                                            <th className="pb-1 text-right font-medium">Available</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {p.stockLevels.map((sl) => (
                                            <tr key={sl.warehouseId} className="border-t border-zinc-50">
                                              <td className="py-1 text-zinc-700">{sl.warehouse.name}</td>
                                              <td className="py-1 text-right font-medium text-zinc-800">
                                                {sl.quantity}
                                              </td>
                                              <td className="py-1 text-right text-zinc-600">{sl.committed}</td>
                                              <td className="py-1 text-right text-zinc-600">
                                                {Math.max(0, sl.quantity - sl.committed)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating chat */}
      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-[68px] items-center justify-center rounded-full bg-[#7438dc] text-white shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle className="size-8 fill-white text-white" />
      </button>

      {/* Drawers / Modals */}
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
          warehouses={warehouses}
        />
      )}
    </div>
  );
}
