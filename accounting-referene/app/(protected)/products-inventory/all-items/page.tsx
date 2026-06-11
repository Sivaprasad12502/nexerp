"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Package,
  Eye,
  Pencil,
  Copy,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Search,
  Download,
  ChevronDown,
  X,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { useInventoryStatus } from "@/lib/hooks/use-inventory-status";
import { ItemForm, type ItemFormData } from "@/components/inventory/item-form";
import { ViewItemDrawer } from "@/components/inventory/view-item-drawer";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function AllItemsPage() {
  const qc = useQueryClient();
  const { manageInventory, warehouseCount, isLoading: statusLoading } = useInventoryStatus();

  const [activeTab, setActiveTab] = useState<TabStatus>("ACTIVE");
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete");
    },
    onSuccess: () => {
      toast.success("Item archived");
      qc.invalidateQueries({ queryKey: ["products"] });
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

  function startDuplicate(p: ProductRow) {
    const { id: _id, status: _status, stockLevels: _sl, ...rest } = p;
    setEditingProduct({ ...rest, id: undefined } as unknown as ProductRow);
    setIsCreating(true);
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
        <div>
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
    <div className="-mx-6 -mt-6">
      {/* Page header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-0 pt-5">
        <div className="flex items-start justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Inventory
            </h1>
          </div>

          {/* Add Item button */}
          <div className="flex items-stretch">
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
              className="flex items-center gap-2 rounded-l-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              Add Item
            </button>
            <div className="w-px bg-[#c4177a]" />
            <button
              disabled={!canAdd}
              className="flex items-center rounded-r-md bg-[#e91e8c] px-2 py-2 text-white hover:bg-[#c4177a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0">
          <Link
            href="/products-inventory/all-items"
            className="border-b-2 border-[#6d28d9] px-1 pb-3 text-sm font-semibold text-[#6d28d9]"
          >
            All Items
          </Link>
          <Link
            href="/products-inventory/warehouse"
            className="ml-6 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-700"
          >
            Warehouses
          </Link>
          <button className="ml-6 flex items-center gap-1 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-700">
            Reports &amp; More
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-5">

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
          {/* Inventory filter dropdown */}
          <div className="relative">
            <select
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value as InventoryFilter)}
              className="appearance-none rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-zinc-800 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            >
              <option value="managed">Managed Inventory</option>
              <option value="unmanaged">Unmanaged Inventory</option>
              <option value="all">All Inventory</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
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
                className="w-44 rounded-md border border-zinc-300 py-2 pl-9 pr-8 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
              />
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs">→</button>
            </div>
          </div>
        </div>

        {/* Tabs (Active / Archived) */}
        <div className="flex gap-1 border-b border-zinc-200">
          {(["ACTIVE", "ARCHIVED"] as TabStatus[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t
                  ? "border-[#6d28d9] text-[#6d28d9]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t === "ACTIVE" ? "Active" : "Archived"}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800"
            >
              {filtersOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              Filters
            </button>
            {(search || inventoryFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setInventoryFilter("all"); }}
                className="ml-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                <X className="size-3" />
                Clear All Filters
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-zinc-500">Applied Filters</p>
              <div className="flex flex-wrap gap-2">
                {inventoryFilter !== "all" && (
                  <span className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
                    <X
                      className="size-3 cursor-pointer hover:text-zinc-900"
                      onClick={() => setInventoryFilter("all")}
                    />
                    {inventoryFilter === "managed" ? "Manage Stock: Yes" : "Manage Stock: No"}
                    <ChevronDown className="size-3 text-zinc-400" />
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
                    <X
                      className="size-3 cursor-pointer hover:text-zinc-900"
                      onClick={() => setSearch("")}
                    />
                    Search: {search}
                  </span>
                )}
                {inventoryFilter === "all" && !search && (
                  <span className="text-xs text-zinc-400">No filters applied</span>
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
                <strong className="text-zinc-800">
                  {filtered.length === 0 ? 0 : 1}
                </strong>{" "}
                to{" "}
                <strong className="text-zinc-800">{filtered.length}</strong>{" "}
                of{" "}
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

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 text-center">
                <Package className="mb-3 size-10 text-zinc-300" />
                <p className="font-medium text-zinc-700">
                  {search ? "No items match your search" : "No items yet"}
                </p>
                {!search && canAdd && (
                  <button
                    onClick={() => { setIsCreating(true); setEditingProduct(null); }}
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
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-100 bg-zinc-50">
                      <tr>
                        <th className="w-8 px-3 py-3">
                          <input type="checkbox" className="rounded border-zinc-300" />
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">
                          Warehouse Details
                        </th>
                        {[
                          { label: "SKU", sort: true },
                          { label: "Image", sort: false },
                          { label: "Original Image", sort: false },
                          { label: "Item", sort: true },
                          { label: "Item Type", sort: true },
                          { label: "Buying Price", sort: true },
                          { label: "Selling Price", sort: true },
                          { label: "Landed Cost", sort: true },
                          { label: "Tax %", sort: false },
                          { label: "Total Stock", sort: false },
                          { label: "Stock Status", sort: false },
                          { label: "Unit", sort: false },
                        ].map(({ label, sort }) => (
                          <th
                            key={label}
                            className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap"
                          >
                            <span className="flex items-center gap-1">
                              {label}
                              {sort && (
                                <svg className="size-3 text-zinc-400" viewBox="0 0 12 12" fill="none">
                                  <path d="M6 2v8M3 5l3-3 3 3M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filtered.map((p) => {
                        const totalStock = p.stockLevels.reduce((s, l) => s + l.quantity, 0);
                        const badge = stockBadge(p);
                        const rowExpanded = expandedRows.has(p.id);

                        return (
                          <>
                            <tr key={p.id} className="hover:bg-zinc-50">
                              <td className="px-3 py-3">
                                <input type="checkbox" className="rounded border-zinc-300" />
                              </td>
                              {/* Warehouse Details expand */}
                              <td className="px-3 py-3">
                                <button
                                  onClick={() => toggleRow(p.id)}
                                  className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50"
                                >
                                  {rowExpanded ? "−" : "+"}
                                </button>
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-zinc-600 whitespace-nowrap">
                                {p.sku || "—"}
                              </td>
                              {/* Image */}
                              <td className="px-3 py-3">
                                {p.image ? (
                                  <img src={p.image} alt="" className="size-8 rounded object-cover border border-zinc-100" />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded border border-zinc-100 bg-zinc-50">
                                    <Package className="size-3.5 text-zinc-300" />
                                  </div>
                                )}
                              </td>
                              {/* Original Image */}
                              <td className="px-3 py-3">
                                {p.originalImage ? (
                                  <img src={p.originalImage} alt="" className="size-8 rounded object-cover border border-zinc-100" />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded border border-zinc-100 bg-zinc-50">
                                    <Package className="size-3.5 text-zinc-300" />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 font-medium text-zinc-900 whitespace-nowrap">
                                {p.name}
                              </td>
                              <td className="px-3 py-3 text-zinc-600">{p.itemType}</td>
                              <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">
                                {p.buyingPrice != null ? `${p.currency ?? "AED"} ${p.buyingPrice.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">
                                {p.sellingPrice != null ? `${p.currency ?? "AED"} ${p.sellingPrice.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">
                                {p.landedCost != null ? `${p.currency ?? "AED"} ${p.landedCost.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-3 py-3 text-zinc-600">
                                {p.taxRate != null ? `${p.taxRate}%` : "—"}
                              </td>
                              <td className="px-3 py-3 font-medium text-zinc-900">{totalStock}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-zinc-500">{p.unit || "—"}</td>
                              {/* Inline actions */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setViewingProductId(p.id)}
                                    title="View"
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingProduct(p)}
                                    title="Edit"
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Pencil className="size-4" />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                                        <MoreHorizontal className="size-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => startDuplicate(p)}>
                                        <Copy className="mr-2 size-4" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setAdjustingProduct(p)}>
                                        <TrendingUp className="mr-2 size-4" />
                                        Adjust Stock
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                          if (window.confirm(`Archive "${p.name}"?`)) {
                                            deleteMutation.mutate(p.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="mr-2 size-4" />
                                        Archive
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded warehouse breakdown */}
                            {rowExpanded && (
                              <tr key={`${p.id}-expanded`} className="bg-zinc-50">
                                <td colSpan={15} className="px-6 py-3">
                                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                                    <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
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
                                              <td className="py-1 text-right font-medium text-zinc-800">{sl.quantity}</td>
                                              <td className="py-1 text-right text-zinc-600">{sl.committed}</td>
                                              <td className="py-1 text-right text-zinc-600">{Math.max(0, sl.quantity - sl.committed)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom count */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Showing{" "}
                  <strong className="text-zinc-800">1</strong> to{" "}
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
            )}
          </>
        )}
      </div>

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
