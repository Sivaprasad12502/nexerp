"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileText,
  Eye,
  ExternalLink,
  Pencil,
  Copy,
  MoreVertical,
  Check,
  Columns3,
  ArrowUpDown,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Filter,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/document-adapter";
import {
  usePurchaseOrders,
  useConvertPoToPurchase,
  useDeletePurchaseOrder,
  type PurchaseOrderRow,
} from "@/lib/hooks/use-purchase-orders";
import { EmailPurchaseOrderSheet } from "./components/email-purchase-order-sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function poStatusBadge(po: PurchaseOrderRow) {
  if (po.sentAt) {
    return {
      label: "Purchase Order Sent",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    };
  }
  return {
    label: "Created",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
  };
}

type ColumnKey =
  | "date"
  | "expand"
  | "poNumber"
  | "vendor"
  | "amount"
  | "status"
  | "paymentDate"
  | "convertPo"
  | "acceptance"
  | "emailVendor"
  | "subTotal"
  | "amountInr"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  expand: true,
  poNumber: true,
  vendor: true,
  amount: true,
  status: true,
  paymentDate: true,
  convertPo: true,
  acceptance: true,
  emailVendor: true,
  subTotal: true,
  amountInr: true,
  actions: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  expand: "Expand Line Items",
  poNumber: "Purchase Order",
  vendor: "Vendor",
  amount: "Amount",
  status: "Status",
  paymentDate: "Payment Date",
  convertPo: "Convert PO",
  acceptance: "Acceptance Status",
  emailVendor: "Email Vendor",
  subTotal: "Sub Total",
  amountInr: "PO Amount in INR",
  actions: "Actions",
};

type Tab = "overview" | "suggested" | "tagwise";
type ViewMode = "active" | "all" | "sent";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderPage() {
  const router = useRouter();
  const { data, isLoading, isError } = usePurchaseOrders();
  const convertMutation = useConvertPoToPurchase();
  const deleteMutation = useDeletePurchaseOrder();

  // ── Table state ──
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [emailPo, setEmailPo] = useState<PurchaseOrderRow | null>(null);
  const [convertPo, setConvertPo] = useState<PurchaseOrderRow | null>(null);

  // ── Tab / UI state ──
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [lifetimeExpanded, setLifetimeExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // ── Filter state ──
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterContact, setFilterContact] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const hasFilters =
    filterStatus !== "" ||
    filterVendor !== "" ||
    filterContact !== "" ||
    filterDateStart !== "" ||
    filterDateEnd !== "";

  const clearFilters = () => {
    setFilterStatus("");
    setFilterVendor("");
    setFilterContact("");
    setFilterDateStart("");
    setFilterDateEnd("");
  };

  const allOrders = data?.purchaseOrders ?? [];

  const filteredOrders = useMemo(() => {
    let result = allOrders;

    if (viewMode === "active") result = result.filter((o) => !o.isConvertedToPurchase);
    if (viewMode === "sent") result = result.filter((o) => Boolean(o.sentAt));

    if (filterStatus === "created") result = result.filter((o) => !o.sentAt);
    if (filterStatus === "sent") result = result.filter((o) => Boolean(o.sentAt));

    if (filterVendor) {
      const q = filterVendor.toLowerCase();
      result = result.filter((o) => o.vendorName.toLowerCase().includes(q));
    }
    if (filterContact) {
      const q = filterContact.toLowerCase();
      result = result.filter((o) => o.vendorName.toLowerCase().includes(q));
    }
    if (filterDateStart) {
      const from = new Date(filterDateStart).getTime();
      result = result.filter((o) => new Date(o.documentDate).getTime() >= from);
    }
    if (filterDateEnd) {
      const to = new Date(filterDateEnd).getTime() + 86399999;
      result = result.filter((o) => new Date(o.documentDate).getTime() <= to);
    }

    return result;
  }, [allOrders, viewMode, filterStatus, filterVendor, filterContact, filterDateStart, filterDateEnd]);

  const total = filteredOrders.length;
  const allTotal = allOrders.length;

  const visibleCount = useMemo(
    () => Object.values(columns).filter(Boolean).length,
    [columns],
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openConvert = (po: PurchaseOrderRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConvertPo(po);
  };

  const confirmConvert = () => {
    if (!convertPo) return;
    convertMutation.mutate(convertPo.id, {
      onSuccess: (data) => {
        setConvertPo(null);
        // Navigate to the newly created expenditure detail page
        router.push(`/purchases/expenditure/${data.document.id}`);
      },
    });
  };

  const handleDelete = (po: PurchaseOrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete purchase order ${po.documentNumber}?`)) return;
    deleteMutation.mutate(po.id);
  };

  const openEmail = (po: PurchaseOrderRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmailPo(po);
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "suggested", label: "Suggested Purchase Orders" },
    { id: "tagwise", label: "Tag-wise Report", badge: "🔥" },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* ── Page header ── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <p className="mb-1 text-xs text-zinc-400">
          apporg <span className="mx-1">›</span> Purchase Orders{" "}
          <span className="mx-1">›</span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Purchase Orders</h1>

          <div className="flex items-stretch overflow-hidden rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => router.push("/purchases/purchase-order/new")}
              className="flex items-center gap-2 bg-[#e8145a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c91050]"
            >
              <Plus className="size-4" />
              Create Purchase Order
            </button>
            <button
              type="button"
              className="border-l border-[#c91050] bg-[#e8145a] px-2 py-2 text-white hover:bg-[#c91050]"
              aria-label="More options"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mr-6 border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#7438dc] text-[#7438dc]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1.5 text-base">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab !== "overview" ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
          <FileText className="mb-3 size-10 text-zinc-300" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="mt-1 text-xs">
            {activeTab === "suggested" && "Suggested Purchase Orders will appear here."}
            {activeTab === "tagwise" && "Tag-wise reporting coming soon."}
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-6">
          {/* ── Lifetime Data ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setLifetimeExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">Lifetime Data</span>
              {lifetimeExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {lifetimeExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Lifetime summary metrics coming soon.
              </div>
            )}
          </div>

          {/* ── View mode dropdown + Download As ── */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="appearance-none bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-700 outline-none"
              >
                <option value="active">Active Purchase Order</option>
                <option value="all">All Purchase Orders</option>
                <option value="sent">Sent Purchase Orders</option>
              </select>
              <span className="pointer-events-none -ml-7 flex items-center pr-2 text-zinc-400">
                <ChevronDown className="size-4" />
              </span>
            </div>

            <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <Download className="size-4" />
                Download As
              </button>
              <button
                type="button"
                className="border-l border-zinc-200 px-2 py-2 text-zinc-400 hover:bg-zinc-50"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800"
              >
                {filtersExpanded ? (
                  <ChevronDown className="size-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="size-4 -rotate-90 text-zinc-500" />
                )}
                <Filter className="size-3.5 text-zinc-500" />
                Filters
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500"
                >
                  <X className="size-3" />
                  Clear All Filters
                </button>
              )}
            </div>

            {filtersExpanded && (
              <div className="border-t border-zinc-100 px-5 pb-4 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Status */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Select Purchase Order Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">Select</option>
                      <option value="created">Created</option>
                      <option value="sent">Purchase Order Sent</option>
                    </select>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Search Vendor
                    </label>
                    <select
                      value={filterVendor}
                      onChange={(e) => setFilterVendor(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">All Vendors</option>
                      {Array.from(
                        new Set(allOrders.map((o) => o.vendorName).filter(Boolean)),
                      ).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contact */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Search Contact
                    </label>
                    <select
                      value={filterContact}
                      onChange={(e) => setFilterContact(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">All Contacts</option>
                      {Array.from(
                        new Set(allOrders.map((o) => o.vendorName).filter(Boolean)),
                      ).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date range */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Select Date Range
                    </label>
                    <div className="flex h-9 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2">
                      <input
                        type="date"
                        value={filterDateStart}
                        onChange={(e) => setFilterDateStart(e.target.value)}
                        className="flex-1 border-0 bg-transparent text-xs text-zinc-700 outline-none"
                        placeholder="Start Date"
                      />
                      <span className="text-xs text-zinc-300">–</span>
                      <input
                        type="date"
                        value={filterDateEnd}
                        onChange={(e) => setFilterDateEnd(e.target.value)}
                        className="flex-1 border-0 bg-transparent text-xs text-zinc-700 outline-none"
                        placeholder="End Date"
                      />
                    </div>
                  </div>
                </div>

                {/* Applied filters chips */}
                {hasFilters && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Applied Filters:</span>
                    {filterStatus && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
                        Status: {filterStatus}
                        <button type="button" onClick={() => setFilterStatus("")}>
                          <X className="size-2.5" />
                        </button>
                      </span>
                    )}
                    {filterVendor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
                        Vendor: {filterVendor}
                        <button type="button" onClick={() => setFilterVendor("")}>
                          <X className="size-2.5" />
                        </button>
                      </span>
                    )}
                    {filterContact && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
                        Contact: {filterContact}
                        <button type="button" onClick={() => setFilterContact("")}>
                          <X className="size-2.5" />
                        </button>
                      </span>
                    )}
                    {(filterDateStart || filterDateEnd) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
                        Date: {filterDateStart || "…"} – {filterDateEnd || "…"}
                        <button
                          type="button"
                          onClick={() => {
                            setFilterDateStart("");
                            setFilterDateEnd("");
                          }}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Purchase Order Summary ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">
                Purchase Order Summary
              </span>
              {summaryExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {summaryExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Purchase order summary metrics coming soon.
              </div>
            )}
          </div>

          {/* ── Table toolbar ── */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Showing <strong>1 to {total}</strong> of{" "}
              <strong>{allTotal} Purchase Orders</strong>
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Columns3 className="size-3.5" />
                  Show/Hide Columns
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {(Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={columns[key]}
                    onCheckedChange={() => toggleColumn(key)}
                  >
                    {COLUMN_LABELS[key]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Table ── */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
                <Loader2 className="size-5 animate-spin" />
                Loading purchase orders…
              </div>
            ) : isError ? (
              <div className="py-20 text-center text-sm text-red-500">
                Failed to load purchase orders.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
                <FileText className="size-10 text-zinc-300" />
                <p className="text-sm">
                  {allTotal === 0
                    ? "No purchase orders yet"
                    : "No orders match the current filters"}
                </p>
                {allTotal === 0 ? (
                  <button
                    type="button"
                    onClick={() => router.push("/purchases/purchase-order/new")}
                    className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
                  >
                    Create Purchase Order
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-[#7438dc] hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1300px] w-full text-sm">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-10`}>
                        <input type="checkbox" className="accent-[#7438dc]" />
                      </th>
                      <th className={`${thClass} w-8`}>#</th>
                      {columns.date && (
                        <th className={thClass}>
                          <span className="inline-flex items-center gap-1">
                            Date <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.expand && (
                        <th className={thClass}>+ Expand Line Items</th>
                      )}
                      {columns.poNumber && <th className={thClass}>Purchase Order</th>}
                      {columns.vendor && <th className={thClass}>Vendor</th>}
                      {columns.amount && (
                        <th className={`${thClass} text-right`}>
                          <span className="inline-flex items-center gap-1">
                            Amount <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.status && (
                        <th className={thClass}>
                          <span className="inline-flex items-center gap-1">
                            Status <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.paymentDate && (
                        <th className={thClass}>
                          <span className="inline-flex items-center gap-1">
                            Payment Date <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.convertPo && <th className={thClass}>Convert PO</th>}
                      {columns.acceptance && (
                        <th className={thClass}>Acceptance Status</th>
                      )}
                      {columns.emailVendor && <th className={thClass}>Email Vendor</th>}
                      {columns.subTotal && (
                        <th className={`${thClass} text-right`}>
                          <span className="inline-flex items-center gap-1">
                            Sub Total <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.amountInr && (
                        <th className={`${thClass} text-right`}>
                          Purchase Order Amount in INR
                        </th>
                      )}
                      {columns.actions && (
                        <th className={`${thClass} w-40`}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredOrders.map((po, index) => {
                      const isOpen = expanded.has(po.id);
                      const badge = poStatusBadge(po);
                      const colCount =
                        2 +
                        (columns.date ? 1 : 0) +
                        (columns.expand ? 1 : 0) +
                        (columns.poNumber ? 1 : 0) +
                        (columns.vendor ? 1 : 0) +
                        (columns.amount ? 1 : 0) +
                        (columns.status ? 1 : 0) +
                        (columns.paymentDate ? 1 : 0) +
                        (columns.convertPo ? 1 : 0) +
                        (columns.acceptance ? 1 : 0) +
                        (columns.emailVendor ? 1 : 0) +
                        (columns.subTotal ? 1 : 0) +
                        (columns.amountInr ? 1 : 0) +
                        (columns.actions ? 1 : 0);

                      return (
                        <Fragment key={po.id}>
                          <tr
                            className="bg-white hover:bg-zinc-50/80 cursor-pointer"
                            onClick={() =>
                              router.push(`/sales-and-invoices/documents/${po.id}`)
                            }
                          >
                            <td
                              className="px-3 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="accent-[#7438dc]"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-xs text-zinc-500">
                              {index + 1}
                            </td>
                            {columns.date && (
                              <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                                {fmt(po.documentDate)}
                              </td>
                            )}
                            {columns.expand && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(po.id)}
                                  className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50"
                                >
                                  {isOpen ? "−" : "+"}
                                </button>
                              </td>
                            )}
                            {columns.poNumber && (
                              <td className="px-3 py-2.5">
                                <span className="font-medium text-zinc-900">
                                  {po.documentNumber}
                                </span>
                                {po.acceptanceStatus === "ACCEPTED" && (
                                  <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                    Accepted
                                  </span>
                                )}
                              </td>
                            )}
                            {columns.vendor && (
                              <td className="px-3 py-2.5 text-zinc-700">
                                {po.vendorName || "—"}
                              </td>
                            )}
                            {columns.amount && (
                              <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                                {formatCurrency(po.totalAmount, po.currency)}
                              </td>
                            )}
                            {columns.status && (
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                            )}
                            {columns.paymentDate && (
                              <td className="px-3 py-2.5 text-zinc-400">—</td>
                            )}
                            {columns.convertPo && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {po.isConvertedToPurchase ? (
                                  <span className="inline-flex size-7 items-center justify-center text-emerald-600">
                                    <Check className="size-4" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => openConvert(po, e)}
                                    disabled={convertMutation.isPending}
                                    className="rounded-md border border-[#7438dc] px-3 py-1 text-xs font-semibold text-[#7438dc] hover:bg-purple-50 disabled:opacity-50"
                                  >
                                    Convert to Purchase
                                  </button>
                                )}
                              </td>
                            )}
                            {columns.acceptance && (
                              <td className="px-3 py-2.5">
                                {po.acceptanceStatus === "ACCEPTED" ? (
                                  <span className="inline-flex size-7 items-center justify-center text-emerald-600">
                                    <Check className="size-4" />
                                  </span>
                                ) : po.acceptanceStatus === "PENDING" ? (
                                  <span className="text-xs text-zinc-400">Pending</span>
                                ) : (
                                  <span className="text-zinc-300">—</span>
                                )}
                              </td>
                            )}
                            {columns.emailVendor && (
                              <td
                                className="px-3 py-2.5 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {po.emailSent ? (
                                  <span className="text-zinc-500">Sent</span>
                                ) : (
                                  <span className="text-zinc-500">
                                    Not Sent{" "}
                                    <button
                                      type="button"
                                      onClick={(e) => openEmail(po, e)}
                                      className="font-semibold text-[#7438dc] hover:underline"
                                    >
                                      (Send)
                                    </button>
                                  </span>
                                )}
                              </td>
                            )}
                            {columns.subTotal && (
                              <td className="px-3 py-2.5 text-right text-zinc-700 whitespace-nowrap">
                                {formatCurrency(po.subTotal, po.currency)}
                              </td>
                            )}
                            {columns.amountInr && (
                              <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                                {formatCurrency(po.totalAmount, po.currency)}
                              </td>
                            )}
                            {columns.actions && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title="View"
                                    onClick={() =>
                                      router.push(
                                        `/sales-and-invoices/documents/${po.id}`,
                                      )
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Open in new tab"
                                    onClick={() =>
                                      window.open(
                                        `/sales-and-invoices/documents/${po.id}`,
                                        "_blank",
                                      )
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <ExternalLink className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Edit"
                                    onClick={() =>
                                      router.push(
                                        `/sales-and-invoices/documents/${po.id}`,
                                      )
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Pencil className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Copy PO number"
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        po.documentNumber,
                                      )
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Copy className="size-4" />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                      >
                                        <MoreVertical className="size-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {!po.isConvertedToPurchase && (
                                        <DropdownMenuItem
                                          onClick={() => openConvert(po)}
                                        >
                                          Convert to Purchase
                                        </DropdownMenuItem>
                                      )}
                                      {po.purchaseDocumentId && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            router.push(
                                              `/purchases/expenditure/${po.purchaseDocumentId}`,
                                            )
                                          }
                                        >
                                          View Purchase (
                                          {po.purchaseDocumentNumber})
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openEmail(po)}
                                      >
                                        Email Vendor
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={(e) =>
                                          handleDelete(
                                            po,
                                            e as unknown as React.MouseEvent,
                                          )
                                        }
                                        disabled={po.isConvertedToPurchase}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            )}
                          </tr>

                          {isOpen && columns.expand && (
                            <tr className="bg-zinc-50/60">
                              <td
                                colSpan={colCount}
                                className="px-4 py-3"
                              >
                                <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-zinc-100 bg-zinc-50">
                                        <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                          Item Name
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                          Hsn/Sac
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                          Sku ID
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                          Tax Rate
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                          Quantity
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                          Rate
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                          Sub Total
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                      {po.items.map((item) => (
                                        <tr key={item.id}>
                                          <td className="px-3 py-2 text-zinc-800">
                                            {item.name}
                                          </td>
                                          <td className="px-3 py-2 text-zinc-600">
                                            {item.hsnSac ?? "—"}
                                          </td>
                                          <td className="px-3 py-2 text-zinc-600">
                                            {item.sku ?? "—"}
                                          </td>
                                          <td className="px-3 py-2 text-right text-zinc-600">
                                            {item.taxRate}
                                          </td>
                                          <td className="px-3 py-2 text-right text-zinc-600">
                                            {item.quantity}
                                          </td>
                                          <td className="px-3 py-2 text-right text-zinc-600">
                                            {item.rate}
                                          </td>
                                          <td className="px-3 py-2 text-right text-zinc-800">
                                            {item.amount}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-zinc-900">
                                            {item.total}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
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
            )}
          </div>

          {total > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Showing 1 to {total} of {allTotal} Purchase Orders
              </span>
              <span className="text-zinc-400">{visibleCount} columns visible</span>
            </div>
          )}
        </div>
      )}

      {/* Convert confirmation modal */}
      <Modal
        open={convertPo !== null}
        onClose={() => setConvertPo(null)}
        title="Convert to Purchase"
        description={
          convertPo
            ? `Convert purchase order ${convertPo.documentNumber} into a purchase record? This will create a purchase bill for ${formatCurrency(convertPo.totalAmount, convertPo.currency)}.`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setConvertPo(null)}
              className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmConvert}
              disabled={convertMutation.isPending}
              className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
            >
              {convertMutation.isPending ? "Converting…" : "Convert to Purchase"}
            </button>
          </>
        }
      >
        {convertPo && (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>
              <span className="font-medium text-zinc-800">Vendor:</span>{" "}
              {convertPo.vendorName}
            </p>
            <p>
              <span className="font-medium text-zinc-800">PO Number:</span>{" "}
              {convertPo.documentNumber}
            </p>
            <p>
              <span className="font-medium text-zinc-800">Amount:</span>{" "}
              {formatCurrency(convertPo.totalAmount, convertPo.currency)}
            </p>
          </div>
        )}
      </Modal>

      {/* Email sheet */}
      {emailPo && (
        <EmailPurchaseOrderSheet
          open
          onOpenChange={(open) => {
            if (!open) setEmailPo(null);
          }}
          purchaseOrder={emailPo}
        />
      )}
    </div>
  );
}
