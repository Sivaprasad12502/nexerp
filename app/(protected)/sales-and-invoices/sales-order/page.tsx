"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileText,
  Eye,
  Trash2,
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
  useSalesOrders,
  useConvertSalesOrderToInvoice,
  useNextDocumentNumber,
  useDeleteSalesOrder,
  type SalesOrderRow,
} from "@/lib/hooks/use-sales-orders";
import { EmailSalesOrderSheet } from "./components/email-sales-order-sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function soStatusBadge(so: SalesOrderRow) {
  if (so.isConvertedToInvoice) {
    return { label: "Invoiced", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  }
  return { label: "Created", className: "bg-orange-50 text-orange-700 ring-orange-200" };
}

type ColumnKey =
  | "date"
  | "expand"
  | "soNumber"
  | "billedTo"
  | "amount"
  | "status"
  | "convertInvoice"
  | "acceptance"
  | "emailClient"
  | "subTotal"
  | "amountInr"
  | "tags"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  expand: true,
  soNumber: true,
  billedTo: true,
  amount: true,
  status: true,
  convertInvoice: true,
  acceptance: true,
  emailClient: true,
  subTotal: true,
  amountInr: true,
  tags: true,
  actions: true,
};

type Tab = "overview" | "suggested" | "clients" | "tagwise";

// ─── Two-step Convert-to-Invoice modal flow ────────────────────────────────────

type ConvertModalStep = "confirm" | "preview";

function ConvertInvoiceFlow({
  so,
  onClose,
}: {
  so: SalesOrderRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<ConvertModalStep>("confirm");
  const convertMutation = useConvertSalesOrderToInvoice();
  const { data: nextNumberData } = useNextDocumentNumber("INVOICE");

  if (!so) return null;

  const handleCreate = () => {
    convertMutation.mutate(so.id, {
      onSuccess: (data) => {
        onClose();
        router.push(`/sales-and-invoices/documents/${data.document.id}`);
      },
    });
  };

  // Step 1 — Confirm
  if (step === "confirm") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Convert to Invoice"
        description={`Convert sales order ${so.documentNumber} into an invoice?`}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep("preview")}
              className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
            >
              Continue
            </button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-zinc-600">
          <p>
            <span className="font-medium text-zinc-800">Billed To:</span>{" "}
            {so.clientName || "—"}
          </p>
          <p>
            <span className="font-medium text-zinc-800">Sales Order #:</span>{" "}
            {so.documentNumber}
          </p>
          <p>
            <span className="font-medium text-zinc-800">Amount:</span>{" "}
            {formatCurrency(so.totalAmount, so.currency)}
          </p>
        </div>
      </Modal>
    );
  }

  // Step 2 — Invoice number preview
  return (
    <Modal
      open
      onClose={() => setStep("confirm")}
      title="Invoice Number"
      description="Your invoice will be created with the following number."
      footer={
        <>
          <button
            type="button"
            onClick={() => setStep("confirm")}
            className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={convertMutation.isPending}
            className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {convertMutation.isPending ? "Creating…" : "Create Invoice"}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">
            Invoice Number (auto-assigned)
          </label>
          <div className="flex h-10 w-full items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-zinc-700">
            {nextNumberData?.nextNumber ?? "Loading…"}
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          This number is assigned automatically based on your existing invoice sequence.
        </p>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesOrderPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useSalesOrders();
  const deleteMutation = useDeleteSalesOrder();

  // ── Table state ──
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [convertSo, setConvertSo] = useState<SalesOrderRow | null>(null);
  const [emailSo, setEmailSo] = useState<SalesOrderRow | null>(null);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ── Collapsible state ──
  const [lifetimeExpanded, setLifetimeExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // ── Status dropdown (the "Active Sales Order" dropdown above filters) ──
  const [viewMode, setViewMode] = useState<"all" | "active" | "invoiced">("active");

  // ── Filter state (functional) ──
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterContact, setFilterContact] = useState<string>("");
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");

  const hasFilters =
    filterStatus !== "" ||
    filterClient !== "" ||
    filterContact !== "" ||
    filterDateStart !== "" ||
    filterDateEnd !== "";

  const clearFilters = () => {
    setFilterStatus("");
    setFilterClient("");
    setFilterContact("");
    setFilterDateStart("");
    setFilterDateEnd("");
  };

  const allOrders = data?.salesOrders ?? [];

  // Apply "view mode" first (top-level status dropdown), then fine-grained filters
  const filteredOrders = useMemo(() => {
    let result = allOrders;

    // Top-level view-mode filter
    if (viewMode === "active") result = result.filter((o) => !o.isConvertedToInvoice);
    if (viewMode === "invoiced") result = result.filter((o) => o.isConvertedToInvoice);

    // Status filter from Filters block
    if (filterStatus === "created") result = result.filter((o) => !o.isConvertedToInvoice);
    if (filterStatus === "invoiced") result = result.filter((o) => o.isConvertedToInvoice);

    // Client search
    if (filterClient) {
      const q = filterClient.toLowerCase();
      result = result.filter((o) => o.clientName.toLowerCase().includes(q));
    }

    // Contact search (same field for simplicity)
    if (filterContact) {
      const q = filterContact.toLowerCase();
      result = result.filter((o) => o.clientName.toLowerCase().includes(q));
    }

    // Date range filter
    if (filterDateStart) {
      const from = new Date(filterDateStart).getTime();
      result = result.filter(
        (o) => new Date(o.documentDate).getTime() >= from,
      );
    }
    if (filterDateEnd) {
      const to = new Date(filterDateEnd).getTime() + 86399999; // end of day
      result = result.filter(
        (o) => new Date(o.documentDate).getTime() <= to,
      );
    }

    return result;
  }, [allOrders, viewMode, filterStatus, filterClient, filterContact, filterDateStart, filterDateEnd]);

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

  const openConvert = (so: SalesOrderRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConvertSo(so);
  };

  const openEmail = (so: SalesOrderRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmailSo(so);
  };

  const handleDelete = (so: SalesOrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete sales order ${so.documentNumber}?`)) return;
    deleteMutation.mutate(so.id);
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "suggested", label: "Suggested Sales Orders" },
    { id: "clients", label: "Manage Clients" },
    { id: "tagwise", label: "Tag-wise Report" },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* ── Page header ── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        {/* Breadcrumb */}
        <p className="mb-1 text-xs text-zinc-400">
          apporg <span className="mx-1">›</span> Sales Order <span className="mx-1">›</span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Sales Order</h1>

          {/* Create button (pink, split) */}
          <div className="flex items-stretch overflow-hidden rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/sales-order/new")}
              className="flex items-center gap-2 bg-[#e8145a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c91050]"
            >
              <Plus className="size-4" />
              Create New Sales Order
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
              {tab.id === "tagwise" && (
                <span className="ml-1.5 text-base">🔥</span>
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
            {activeTab === "suggested" && "Suggested Sales Orders will appear here."}
            {activeTab === "clients" && "Client management view coming soon."}
            {activeTab === "tagwise" && "Tag-wise reporting coming soon."}
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-6">
          {/* ── Lifetime Data collapsible (placeholder) ── */}
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
                onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
                className="appearance-none bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-700 outline-none"
              >
                <option value="active">Active Sales Order</option>
                <option value="all">All Sales Orders</option>
                <option value="invoiced">Invoiced Sales Orders</option>
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

          {/* ── Filters block ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            {/* Filter header */}
            <div className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800"
              >
                {filtersExpanded ? (
                  <ChevronDown className="size-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="size-4 text-zinc-500 -rotate-90" />
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
                      Select Sales Order Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">Select</option>
                      <option value="created">Created</option>
                      <option value="invoiced">Invoiced</option>
                    </select>
                  </div>

                  {/* Client */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Search Client
                    </label>
                    <div className="relative">
                      <select
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                      >
                        <option value="">All Clients</option>
                        {Array.from(new Set(allOrders.map((o) => o.clientName).filter(Boolean))).map(
                          (name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
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
                      {Array.from(new Set(allOrders.map((o) => o.clientName).filter(Boolean))).map(
                        (name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ),
                      )}
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

                {/* Applied filters summary */}
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
                    {filterClient && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
                        Client: {filterClient}
                        <button type="button" onClick={() => setFilterClient("")}>
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

          {/* ── Sales Order Summary (placeholder collapsible) ── */}
          <div className="mb-3 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">Sales Order Summary</span>
              {summaryExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {summaryExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Sales order summary metrics coming soon.
              </div>
            )}
          </div>

          {/* ── Sales Order Graph (placeholder collapsible) ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setGraphExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">Sales Order Graph</span>
              {graphExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {graphExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Sales order graph coming soon.
              </div>
            )}
          </div>

          {/* ── Table toolbar ── */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Showing <strong>1 to {total}</strong> of{" "}
              <strong>{allTotal} Sales Orders</strong>
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
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
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
                Loading sales orders…
              </div>
            ) : isError ? (
              <div className="py-20 text-center text-sm text-red-500">
                Failed to load sales orders.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
                <FileText className="size-10 text-zinc-300" />
                <p className="text-sm">
                  {allTotal === 0 ? "No sales orders yet" : "No orders match the current filters"}
                </p>
                {allTotal === 0 ? (
                  <p className="max-w-sm text-center text-xs text-zinc-400">
                    Create a new sales order or accept a purchase order to get started.
                  </p>
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
                <table className="min-w-[1200px] w-full text-sm">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-10`}>#</th>
                      {columns.date && (
                        <th className={thClass}>
                          <span className="inline-flex items-center gap-1">
                            Date <ArrowUpDown className="size-3 opacity-40" />
                          </span>
                        </th>
                      )}
                      {columns.expand && <th className={`${thClass} w-12`} />}
                      {columns.soNumber && <th className={thClass}>Sales Order</th>}
                      {columns.billedTo && <th className={thClass}>Billed To</th>}
                      {columns.amount && (
                        <th className={`${thClass} text-right`}>Amount</th>
                      )}
                      {columns.status && <th className={thClass}>Status</th>}
                      {columns.convertInvoice && (
                        <th className={thClass}>Convert to Invoice</th>
                      )}
                      {columns.acceptance && (
                        <th className={thClass}>Acceptance Status</th>
                      )}
                      {columns.emailClient && (
                        <th className={thClass}>Sales Order Email</th>
                      )}
                      {columns.subTotal && (
                        <th className={`${thClass} text-right`}>Sub Total</th>
                      )}
                      {columns.amountInr && (
                        <th className={`${thClass} text-right`}>
                          Sales Order Amount in INR
                        </th>
                      )}
                      {columns.tags && <th className={thClass}>Tags</th>}
                      {columns.actions && (
                        <th className={`${thClass} w-28`}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredOrders.map((so, index) => {
                      const isOpen = expanded.has(so.id);
                      const badge = soStatusBadge(so);
                      const colSpan =
                        1 +
                        (columns.date ? 1 : 0) +
                        (columns.expand ? 1 : 0) +
                        (columns.soNumber ? 1 : 0) +
                        (columns.billedTo ? 1 : 0) +
                        (columns.amount ? 1 : 0) +
                        (columns.status ? 1 : 0) +
                        (columns.convertInvoice ? 1 : 0) +
                        (columns.acceptance ? 1 : 0) +
                        (columns.emailClient ? 1 : 0) +
                        (columns.subTotal ? 1 : 0) +
                        (columns.amountInr ? 1 : 0) +
                        (columns.tags ? 1 : 0) +
                        (columns.actions ? 1 : 0);

                      return (
                        <Fragment key={so.id}>
                          <tr
                            className="bg-white hover:bg-zinc-50/80 cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/sales-and-invoices/documents/${so.id}`,
                              )
                            }
                          >
                            <td className="px-3 py-2.5 text-xs text-zinc-500">
                              {index + 1}
                            </td>
                            {columns.date && (
                              <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                                {fmt(so.documentDate)}
                              </td>
                            )}
                            {columns.expand && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(so.id)}
                                  className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50"
                                >
                                  {isOpen ? "−" : "+"}
                                </button>
                              </td>
                            )}
                            {columns.soNumber && (
                              <td className="px-3 py-2.5 font-medium text-zinc-900">
                                {so.documentNumber}
                              </td>
                            )}
                            {columns.billedTo && (
                              <td className="px-3 py-2.5 text-zinc-700">
                                {so.clientName || "—"}
                              </td>
                            )}
                            {columns.amount && (
                              <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                                {formatCurrency(so.totalAmount, so.currency)}
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
                            {columns.convertInvoice && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {so.isConvertedToInvoice ? (
                                  <span className="inline-flex size-7 items-center justify-center text-emerald-600">
                                    <Check className="size-4" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => openConvert(so, e)}
                                    className="rounded-md border border-[#7438dc] px-3 py-1 text-xs font-semibold text-[#7438dc] hover:bg-purple-50"
                                  >
                                    Convert to Invoice
                                  </button>
                                )}
                              </td>
                            )}
                            {columns.acceptance && (
                              <td className="px-3 py-2.5">
                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  Accepted
                                </span>
                              </td>
                            )}
                            {columns.emailClient && (
                              <td className="px-3 py-2.5 text-xs text-zinc-400">
                                {so.emailSent ? (
                                  "Sent"
                                ) : (
                                  <>
                                    Not Sent{" "}
                                    <button
                                      type="button"
                                      onClick={(e) => openEmail(so, e)}
                                      className="text-[#7438dc] underline hover:no-underline"
                                    >
                                      (Send)
                                    </button>
                                  </>
                                )}
                              </td>
                            )}
                            {columns.subTotal && (
                              <td className="px-3 py-2.5 text-right text-zinc-700 whitespace-nowrap">
                                {formatCurrency(so.subTotal, so.currency)}
                              </td>
                            )}
                            {columns.amountInr && (
                              <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                                {formatCurrency(so.totalAmount, so.currency)}
                              </td>
                            )}
                            {columns.tags && (
                              <td
                                className="px-3 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="rounded border border-purple-200 px-2 py-0.5 text-xs text-[#7438dc] hover:bg-purple-50"
                                >
                                  + Add Tags
                                </button>
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
                                        `/sales-and-invoices/documents/${so.id}`,
                                      )
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={(e) => handleDelete(so, e)}
                                    disabled={
                                      so.isConvertedToInvoice ||
                                      deleteMutation.isPending
                                    }
                                    className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                  >
                                    <Trash2 className="size-4" />
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
                                      {!so.isConvertedToInvoice && (
                                        <DropdownMenuItem
                                          onClick={() => openConvert(so)}
                                        >
                                          Convert to Invoice
                                        </DropdownMenuItem>
                                      )}
                                      {so.invoiceDocumentId && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            router.push(
                                              `/sales-and-invoices/documents/${so.invoiceDocumentId}`,
                                            )
                                          }
                                        >
                                          View Invoice ({so.invoiceDocumentNumber})
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/sales-and-invoices/documents/${so.id}`,
                                          )
                                        }
                                      >
                                        View Document
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            )}
                          </tr>

                          {isOpen && columns.expand && (
                            <tr className="bg-zinc-50/60">
                              <td colSpan={colSpan} className="px-4 py-3">
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
                                      {so.items.map((item) => (
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
                Showing 1 to {total} of {allTotal} Sales Orders
              </span>
              <span className="text-zinc-400">{visibleCount} columns visible</span>
            </div>
          )}
        </div>
      )}

      {/* Two-step Convert to Invoice flow */}
      <ConvertInvoiceFlow so={convertSo} onClose={() => setConvertSo(null)} />

      {emailSo && (
        <EmailSalesOrderSheet
          open={Boolean(emailSo)}
          onOpenChange={(open) => !open && setEmailSo(null)}
          salesOrder={emailSo}
        />
      )}
    </div>
  );
}
