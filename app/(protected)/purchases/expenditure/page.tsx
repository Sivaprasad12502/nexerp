"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileText,
  Eye,
  ExternalLink,
  MoreVertical,
  Columns3,
  ArrowUpDown,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Filter,
  Tag,
  Lightbulb,
  Camera,
} from "lucide-react";

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
  useExpenditures,
  useDeleteExpenditure,
  type ExpenditureRow,
} from "@/lib/hooks/use-expenditures";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";
import { EmailDocumentSheet } from "../../sales-and-invoices/documents/components/email-document-sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Column config ────────────────────────────────────────────────────────────

type ColumnKey =
  | "expenseDate"
  | "expand"
  | "invoice"
  | "vendor"
  | "amount"
  | "status"
  | "paymentDate"
  | "expenditure"
  | "createdAt"
  | "pettyExpenditure"
  | "acceptanceStatus"
  | "emailVendor"
  | "reverseCharge"
  | "subTotal"
  | "amountInr"
  | "tags"
  | "scanned"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  expenseDate: true,
  expand: true,
  invoice: true,
  vendor: true,
  amount: true,
  status: true,
  paymentDate: true,
  expenditure: true,
  createdAt: true,
  pettyExpenditure: true,
  acceptanceStatus: true,
  emailVendor: true,
  reverseCharge: true,
  subTotal: true,
  amountInr: true,
  tags: true,
  scanned: true,
  actions: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  expenseDate: "Expense Date",
  expand: "Expand Line Items",
  invoice: "Invoice",
  vendor: "Vendor",
  amount: "Amount",
  status: "Status",
  paymentDate: "Payment Date",
  expenditure: "Expenditure",
  createdAt: "Created At",
  pettyExpenditure: "Petty Expenditure",
  acceptanceStatus: "Acceptance Status",
  emailVendor: "Email Vendor",
  reverseCharge: "Reverse Charge Applicable",
  subTotal: "Sub Total",
  amountInr: "Expenditure Amount in INR",
  tags: "Tags",
  scanned: "Scanned",
  actions: "Actions",
};

type ViewMode = "active" | "all" | "paid";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpenditurePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useExpenditures();
  const deleteMutation = useDeleteExpenditure();

  // ── Table state ──
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [emailExp, setEmailExp] = useState<ExpenditureRow | null>(null);

  // ── UI state ──
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

  const allExpenditures = data?.expenditures ?? [];

  const filteredExpenditures = useMemo(() => {
    let result = allExpenditures;

    if (viewMode === "paid") result = result.filter((e) => e.paymentStatus === "PAID");
    // "active" = all expenditures

    if (filterStatus === "paid") result = result.filter((e) => e.paymentStatus === "PAID");
    if (filterStatus === "unpaid") result = result.filter((e) => e.paymentStatus !== "PAID");

    if (filterVendor) {
      const q = filterVendor.toLowerCase();
      result = result.filter((e) => e.vendorName.toLowerCase().includes(q));
    }
    if (filterContact) {
      const q = filterContact.toLowerCase();
      result = result.filter((e) => e.vendorName.toLowerCase().includes(q));
    }
    if (filterDateStart) {
      const from = new Date(filterDateStart).getTime();
      result = result.filter((e) => new Date(e.documentDate).getTime() >= from);
    }
    if (filterDateEnd) {
      const to = new Date(filterDateEnd).getTime() + 86399999;
      result = result.filter((e) => new Date(e.documentDate).getTime() <= to);
    }

    return result;
  }, [allExpenditures, viewMode, filterStatus, filterVendor, filterContact, filterDateStart, filterDateEnd]);

  const total = filteredExpenditures.length;
  const allTotal = allExpenditures.length;

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

  const handleDelete = (exp: ExpenditureRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete expenditure ${exp.documentNumber}?`)) return;
    deleteMutation.mutate(exp.id);
  };

  const openEmail = (exp: ExpenditureRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmailExp(exp);
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

  // Compute colspan for expanded row
  const colCount =
    2 +
    Object.values(columns).filter(Boolean).length;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* ── Page header ── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        {/* Breadcrumb */}
        <p className="mb-1 text-xs text-zinc-400">
          apporg <span className="mx-1">›</span> Purchases and Expenses{" "}
          <span className="mx-1">›</span>
        </p>

        {/* Title + action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">Purchases and Expenses</h1>
            <Lightbulb className="size-5 text-amber-400" />
          </div>

          <div className="flex items-center gap-2">
            {/* Scan Invoice — stub */}
            <button
              type="button"
              onClick={() => {}}
              className="flex items-center gap-1.5 rounded-md border border-[#7438dc] px-3 py-2 text-sm font-medium text-[#7438dc] transition-colors hover:bg-purple-50"
            >
              <Camera className="size-4" />
              Scan Invoice
            </button>

            {/* + New Expense */}
            <button
              type="button"
              onClick={() => router.push("/purchases/expenditure/new")}
              className="flex items-center gap-1.5 rounded-md border border-[#7438dc] px-3 py-2 text-sm font-medium text-[#7438dc] transition-colors hover:bg-purple-50"
            >
              <Plus className="size-4" />
              New Expense
            </button>

            {/* + New Purchase — pink split-button */}
            <div className="flex items-stretch overflow-hidden rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => router.push("/purchases/expenditure/new")}
                className="flex items-center gap-2 bg-[#e8145a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c91050]"
              >
                <Plus className="size-4" />
                New Purchase
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
        </div>

        {/* Tab nav */}
        <div className="mt-4 flex items-center gap-6 border-t border-zinc-100 pt-3">
          <button
            type="button"
            className="border-b-2 border-[#7438dc] pb-1 text-sm font-semibold text-[#7438dc]"
          >
            Overview
          </button>
          <button
            type="button"
            className="pb-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Suggested Purchases
          </button>
          <button
            type="button"
            className="pb-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Manage Vendors
          </button>
          <button
            type="button"
            className="pb-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Scanned Documents
          </button>
          <button
            type="button"
            className="flex items-center gap-0.5 pb-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Reports and More <span className="ml-0.5">›</span>
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
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

        {/* ── View mode + Download As ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="appearance-none bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-700 outline-none"
            >
              <option value="active">All Purchases &amp; Expenses</option>
              <option value="paid">Paid</option>
              <option value="all">All Records</option>
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
                    Select Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                  >
                    <option value="">Select</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
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
                      new Set(allExpenditures.map((e) => e.vendorName).filter(Boolean)),
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
                      new Set(allExpenditures.map((e) => e.vendorName).filter(Boolean)),
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
                    />
                    <span className="text-xs text-zinc-300">–</span>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="flex-1 border-0 bg-transparent text-xs text-zinc-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Applied filter chips */}
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

        {/* ── Expenditure Summary ── */}
        <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setSummaryExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-zinc-800">
              Purchases &amp; Expenses Summary
            </span>
            {summaryExpanded ? (
              <ChevronUp className="size-4 text-zinc-400" />
            ) : (
              <ChevronDown className="size-4 text-zinc-400" />
            )}
          </button>
          {summaryExpanded && (
            <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
              Summary metrics coming soon.
            </div>
          )}
        </div>

        {/* ── Table toolbar ── */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            Showing <strong>1 to {total}</strong> of{" "}
            <strong>{allTotal} Purchases and Expenses</strong>
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
            <DropdownMenuContent align="end" className="w-60">
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
              Loading purchases &amp; expenses…
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-red-500">
              Failed to load purchases &amp; expenses.
            </div>
          ) : filteredExpenditures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
              <FileText className="size-10 text-zinc-300" />
              <p className="text-sm">
                {allTotal === 0
                  ? "No purchases & expenses yet"
                  : "No records match the current filters"}
              </p>
              {allTotal > 0 && (
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
              <table className="min-w-[1600px] w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>
                      <input type="checkbox" className="accent-[#7438dc]" />
                    </th>
                    <th className={`${thClass} w-8`}>#</th>
                    {columns.expenseDate && (
                      <th className={thClass}>
                        <span className="inline-flex items-center gap-1">
                          Expense Date <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.expand && <th className={thClass}>+ Expand Line Items</th>}
                    {columns.invoice && <th className={thClass}>Invoice</th>}
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
                    {columns.expenditure && <th className={thClass}>Expenditure</th>}
                    {columns.createdAt && (
                      <th className={thClass}>
                        <span className="inline-flex items-center gap-1">
                          Created At <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.pettyExpenditure && <th className={thClass}>Petty Expenditure</th>}
                    {columns.acceptanceStatus && <th className={thClass}>Acceptance Status</th>}
                    {columns.emailVendor && <th className={thClass}>Email Vendor</th>}
                    {columns.reverseCharge && <th className={thClass}>Reverse Charge Applicable</th>}
                    {columns.subTotal && (
                      <th className={`${thClass} text-right`}>
                        <span className="inline-flex items-center gap-1">
                          Sub Total <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.amountInr && (
                      <th className={`${thClass} text-right`}>
                        Expenditure Amount in INR
                      </th>
                    )}
                    {columns.tags && <th className={thClass}>Tags</th>}
                    {columns.scanned && <th className={thClass}>Scanned</th>}
                    {columns.actions && <th className={`${thClass} w-24`}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredExpenditures.map((exp, index) => {
                    const isOpen = expanded.has(exp.id);

                    return (
                      <Fragment key={exp.id}>
                        <tr
                          className="bg-white hover:bg-zinc-50/80 cursor-pointer"
                          onClick={() =>
                            router.push(`/purchases/expenditure/${exp.id}`)
                          }
                        >
                          <td
                            className="px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input type="checkbox" className="accent-[#7438dc]" />
                          </td>
                          <td className="px-3 py-2.5 text-xs text-zinc-500">
                            {index + 1}
                          </td>
                          {columns.expenseDate && (
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                              {fmt(exp.documentDate)}
                            </td>
                          )}
                          {columns.expand && (
                            <td
                              className="px-3 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => toggleExpand(exp.id)}
                                className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50"
                              >
                                {isOpen ? "−" : "+"}
                              </button>
                            </td>
                          )}
                          {columns.invoice && (
                            <td className="px-3 py-2.5">
                              {/* Acceptance status is stub — no backing field */}
                              <span className="text-zinc-400 text-xs">—</span>
                            </td>
                          )}
                          {columns.vendor && (
                            <td className="px-3 py-2.5 text-zinc-700">
                              {exp.vendorName || "—"}
                            </td>
                          )}
                          {columns.amount && (
                            <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                              {formatCurrency(exp.totalAmount, exp.currency)}
                            </td>
                          )}
                          {columns.status && (
                            <td className="px-3 py-2.5">
                              {exp.paymentStatus === "PAID" ? (
                                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 bg-orange-50 text-orange-700 ring-orange-200">
                                  Unpaid
                                </span>
                              )}
                            </td>
                          )}
                          {columns.paymentDate && (
                            <td className="px-3 py-2.5 text-zinc-700">
                              {exp.paymentDate ? fmt(exp.paymentDate) : "—"}
                            </td>
                          )}
                          {columns.expenditure && (
                            <td className="px-3 py-2.5">
                              <span className="font-medium text-zinc-900 block">
                                #{exp.documentNumber}
                              </span>
                              <span className="text-xs text-zinc-400">
                                Created on {fmt(exp.createdAt)}
                              </span>
                            </td>
                          )}
                          {columns.createdAt && (
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                              {fmt(exp.createdAt)}
                            </td>
                          )}
                          {columns.pettyExpenditure && (
                            <td className="px-3 py-2.5 text-zinc-500 text-xs">No</td>
                          )}
                          {columns.acceptanceStatus && (
                            <td className="px-3 py-2.5 text-zinc-400 text-xs">—</td>
                          )}
                          {columns.emailVendor && (
                            <td
                              className="px-3 py-2.5 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {exp.emailSent ? (
                                <span className="text-zinc-500">Sent</span>
                              ) : (
                                <span className="text-zinc-500">
                                  Not Sent{" "}
                                  <button
                                    type="button"
                                    onClick={(e) => openEmail(exp, e)}
                                    className="font-semibold text-[#7438dc] hover:underline"
                                  >
                                    (Send)
                                  </button>
                                </span>
                              )}
                            </td>
                          )}
                          {columns.reverseCharge && (
                            <td className="px-3 py-2.5 text-zinc-500 text-xs">No</td>
                          )}
                          {columns.subTotal && (
                            <td className="px-3 py-2.5 text-right text-zinc-700 whitespace-nowrap">
                              {formatCurrency(exp.subTotal, exp.currency)}
                            </td>
                          )}
                          {columns.amountInr && (
                            <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                              {formatCurrency(exp.totalAmount, exp.currency)}
                            </td>
                          )}
                          {columns.tags && (
                            <td
                              className="px-3 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs text-[#7438dc] hover:underline"
                              >
                                <Tag className="size-3" />
                                + Add Tags
                              </button>
                            </td>
                          )}
                          {columns.scanned && (
                            <td className="px-3 py-2.5 text-zinc-400 text-xs">—</td>
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
                                    router.push(`/purchases/expenditure/${exp.id}`)
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
                                      `/purchases/expenditure/${exp.id}`,
                                      "_blank",
                                    )
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <ExternalLink className="size-4" />
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
                                    <DropdownMenuItem
                                      onClick={() => openEmail(exp)}
                                    >
                                      Email Vendor
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={(e) =>
                                        handleDelete(
                                          exp,
                                          e as unknown as React.MouseEvent,
                                        )
                                      }
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
                            <td colSpan={colCount} className="px-4 py-3">
                              <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50">
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Item Name</th>
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Hsn/Sac</th>
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Sku ID</th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">Tax Rate</th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">Quantity</th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">Rate</th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">Sub Total</th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-50">
                                    {exp.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="px-3 py-2 text-zinc-800">{item.name}</td>
                                        <td className="px-3 py-2 text-zinc-600">{item.hsnSac ?? "—"}</td>
                                        <td className="px-3 py-2 text-zinc-600">{item.sku ?? "—"}</td>
                                        <td className="px-3 py-2 text-right text-zinc-600">{item.taxRate}</td>
                                        <td className="px-3 py-2 text-right text-zinc-600">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right text-zinc-600">{item.rate}</td>
                                        <td className="px-3 py-2 text-right text-zinc-800">{item.amount}</td>
                                        <td className="px-3 py-2 text-right font-medium text-zinc-900">{item.total}</td>
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
              Showing 1 to {total} of {allTotal} Purchases and Expenses
            </span>
            <span className="text-zinc-400">{visibleCount} columns visible</span>
          </div>
        )}
      </div>

      {/* Email sheet */}
      {emailExp && (
        <EmailDocumentSheet
          open
          onOpenChange={(open) => {
            if (!open) setEmailExp(null);
          }}
          document={adaptDocumentToQuotationRow(
            {
              id: emailExp.id,
              type: "INVOICE",
              documentNumber: emailExp.documentNumber,
              documentDate: emailExp.documentDate as string,
              validTillDate: null,
              title: null,
              subtitle: null,
              logo: null,
              currency: emailExp.currency,
              fromName: emailExp.fromName,
              fromAddress: null,
              fromGstin: null,
              fromPan: null,
              clientId: emailExp.client?.id ?? null,
              clientName: emailExp.clientName,
              clientAddress: null,
              clientGstin: null,
              discountLabel: null,
              discountAmount: 0,
              additionalCharges: [],
              subTotal: emailExp.subTotal,
              totalTax: 0,
              totalDiscount: 0,
              totalQuantity: 0,
              totalAmount: emailExp.totalAmount,
              amountInWords: null,
              termsAndConditions: null,
              notes: null,
              signature: null,
              additionalInfo: null,
              contactDetails: null,
              attachments: [],
              customFields: [],
              settings: {},
              status: emailExp.status,
              createdAt: emailExp.createdAt,
              client: emailExp.client
                ? {
                    id: emailExp.client.id,
                    businessName: emailExp.client.businessName,
                    logo: emailExp.client.logo,
                    email: emailExp.client.email,
                    phone: null,
                    streetAddress: null,
                    addressCity: null,
                    state: null,
                    addressCountry: null,
                    trn: null,
                    vatNumber: null,
                  }
                : null,
              items: emailExp.items.map((item) => ({
                id: item.id,
                productId: null,
                name: item.name,
                sku: item.sku,
                hsnSac: item.hsnSac,
                unit: null,
                description: null,
                image: null,
                groupName: null,
                quantity: item.quantity,
                rate: item.rate,
                discount: 0,
                taxRate: item.taxRate,
                taxAmount: 0,
                amount: item.amount,
                total: item.total,
                sortOrder: 0,
              })),
            },
            "Expenditure",
          )}
          documentId={emailExp.id}
          clientEmail={emailExp.vendorEmail}
          documentLabel="Expenditure"
        />
      )}
    </div>
  );
}
