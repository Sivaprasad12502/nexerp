"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  FileText,
  Eye,
  Pencil,
  Copy,
  MoreVertical,
  Check,
  CheckCircle2,
  Columns3,
  ArrowUpDown,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Plus,
  Camera,
  Lightbulb,
  Download,
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
  useInvoices,
  useMarkInvoicePaid,
  useDeleteInvoice,
  type InvoiceRow,
} from "@/lib/hooks/use-invoices";
import { EmailInvoiceSheet } from "./components/email-invoice-sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paymentBadges(invoice: InvoiceRow) {
  if (invoice.paymentStatus === "PAID") {
    return [
      {
        label: "Paid",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      },
    ];
  }
  return [
    {
      label: "Unpaid",
      className: "bg-orange-50 text-orange-700 ring-orange-200",
    },
    {
      label: "Pending",
      className: "bg-red-50 text-red-700 ring-red-200",
    },
  ];
}

type ColumnKey =
  | "date"
  | "expand"
  | "invoice"
  | "billedTo"
  | "amount"
  | "status"
  | "paymentDate"
  | "acceptance"
  | "eInvoiceDetails"
  | "eInvoiceAckNo"
  | "eInvoiceAckDate"
  | "eWayBillNo"
  | "eWayBillDate"
  | "eWayBillValidTill"
  | "eInvoiceStatus"
  | "invoiceEmail"
  | "reverseCharge"
  | "subTotal"
  | "amountInr"
  | "tags"
  | "scannedDocument"
  | "workflowName"
  | "currentAssignee"
  | "currentStage"
  | "currentStatus"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  expand: true,
  invoice: true,
  billedTo: true,
  amount: true,
  status: true,
  paymentDate: true,
  acceptance: true,
  eInvoiceDetails: true,
  eInvoiceAckNo: true,
  eInvoiceAckDate: true,
  eWayBillNo: true,
  eWayBillDate: true,
  eWayBillValidTill: true,
  eInvoiceStatus: true,
  invoiceEmail: true,
  reverseCharge: true,
  subTotal: true,
  amountInr: true,
  tags: true,
  scannedDocument: true,
  workflowName: true,
  currentAssignee: true,
  currentStage: true,
  currentStatus: true,
  actions: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  expand: "Expand Line Items",
  invoice: "Invoice",
  billedTo: "Billed To",
  amount: "Amount",
  status: "Status",
  paymentDate: "Payment Date",
  acceptance: "Acceptance Status",
  eInvoiceDetails: "E-invoice Details",
  eInvoiceAckNo: "E-invoice Ack No.",
  eInvoiceAckDate: "E-invoice Ack Date",
  eWayBillNo: "E-way Bill No.",
  eWayBillDate: "E-way Bill Date",
  eWayBillValidTill: "E-way Bill Valid Till",
  eInvoiceStatus: "E-invoice Status",
  invoiceEmail: "Invoice Email",
  reverseCharge: "Reverse Charge Applicable",
  subTotal: "Sub Total",
  amountInr: "Invoice Amount in INR",
  tags: "Tags",
  scannedDocument: "Scanned Document",
  workflowName: "Workflow Name",
  currentAssignee: "Current Assignee",
  currentStage: "Current Stage",
  currentStatus: "Current Status",
  actions: "Actions",
};

type ViewMode = "active" | "all" | "paid" | "sent";
type Tab =
  | "overview"
  | "suggested"
  | "clients"
  | "scanned"
  | "payments"
  | "reports";

const TABS: { id: Tab; label: string; showChevron?: boolean }[] = [
  { id: "overview", label: "Overview" },
  { id: "suggested", label: "Suggested Invoice" },
  { id: "clients", label: "Manage Clients" },
  { id: "scanned", label: "Scanned Documents" },
  { id: "payments", label: "Online Payments" },
  { id: "reports", label: "Reports & More", showChevron: true },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useInvoices();
  const markPaidMutation = useMarkInvoicePaid();
  const deleteMutation = useDeleteInvoice();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [emailInvoice, setEmailInvoice] = useState<InvoiceRow | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [lifetimeExpanded, setLifetimeExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterContact, setFilterContact] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

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

  const allInvoices = data?.invoices ?? [];

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Set(allInvoices.map((i) => i.billedTo).filter(Boolean)),
      ).sort(),
    [allInvoices],
  );

  const contactOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allInvoices
            .map((i) => i.clientEmail ?? i.billedTo)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [allInvoices],
  );

  const filteredInvoices = useMemo(() => {
    let result = allInvoices;

    if (viewMode === "active") {
      result = result.filter((i) => i.paymentStatus !== "PAID");
    }
    if (viewMode === "paid") {
      result = result.filter((i) => i.paymentStatus === "PAID");
    }
    if (viewMode === "sent") {
      result = result.filter((i) => i.emailSent);
    }

    if (filterStatus === "unpaid") {
      result = result.filter((i) => i.paymentStatus !== "PAID");
    }
    if (filterStatus === "paid") {
      result = result.filter((i) => i.paymentStatus === "PAID");
    }
    if (filterStatus === "pending") {
      result = result.filter(
        (i) => i.paymentStatus === "PENDING" || i.paymentStatus === "UNPAID",
      );
    }
    if (filterStatus === "sent") {
      result = result.filter((i) => i.emailSent);
    }

    if (filterClient) {
      result = result.filter((i) => i.billedTo === filterClient);
    }
    if (filterContact) {
      result = result.filter(
        (i) =>
          (i.clientEmail ?? i.billedTo) === filterContact ||
          i.billedTo === filterContact,
      );
    }
    if (filterDateStart) {
      const from = new Date(filterDateStart).getTime();
      result = result.filter((i) => new Date(i.documentDate).getTime() >= from);
    }
    if (filterDateEnd) {
      const to = new Date(filterDateEnd).getTime() + 86399999;
      result = result.filter((i) => new Date(i.documentDate).getTime() <= to);
    }

    return result;
  }, [
    allInvoices,
    viewMode,
    filterStatus,
    filterClient,
    filterContact,
    filterDateStart,
    filterDateEnd,
  ]);

  const total = filteredInvoices.length;
  const allTotal = allInvoices.length;

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

  const openEmail = (invoice: InvoiceRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmailInvoice(invoice);
  };

  const handleMarkPaid = (invoice: InvoiceRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (invoice.paymentStatus === "PAID") return;
    markPaidMutation.mutate(invoice.id);
  };

  const handleDelete = (invoice: InvoiceRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete invoice ${invoice.documentNumber}?`)) return;
    deleteMutation.mutate(invoice.id);
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

  function countCols() {
    let n = 2;
    if (columns.date) n++;
    if (columns.expand) n++;
    if (columns.invoice) n++;
    if (columns.billedTo) n++;
    if (columns.amount) n++;
    if (columns.status) n++;
    if (columns.paymentDate) n++;
    if (columns.acceptance) n++;
    if (columns.eInvoiceDetails) n++;
    if (columns.eInvoiceAckNo) n++;
    if (columns.eInvoiceAckDate) n++;
    if (columns.eWayBillNo) n++;
    if (columns.eWayBillDate) n++;
    if (columns.eWayBillValidTill) n++;
    if (columns.eInvoiceStatus) n++;
    if (columns.invoiceEmail) n++;
    if (columns.reverseCharge) n++;
    if (columns.subTotal) n++;
    if (columns.amountInr) n++;
    if (columns.tags) n++;
    if (columns.scannedDocument) n++;
    if (columns.workflowName) n++;
    if (columns.currentAssignee) n++;
    if (columns.currentStage) n++;
    if (columns.currentStatus) n++;
    if (columns.actions) n++;
    return n;
  }

  const ColumnToggle = ({ align = "end" }: { align?: "start" | "end" }) => (
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
      <DropdownMenuContent align={align} className="max-h-80 w-56 overflow-y-auto">
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
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* ── Page header ── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <p className="mb-1 text-xs text-zinc-400">
          apporg <span className="mx-1">›</span> Invoices <span className="mx-1">›</span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
            Invoice
            <Lightbulb className="size-5 text-amber-400" />
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toast.info("Scan Invoice coming soon")}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Camera className="size-4" />
              Scan Invoice
            </button>

            <div className="flex items-stretch overflow-hidden rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => router.push("/sales-and-invoices/invoice/new")}
                className="flex items-center gap-2 bg-[#e8145a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c91050]"
              >
                <Plus className="size-4" />
                Create New Invoice
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

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mr-6 flex items-center gap-0.5 border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#7438dc] text-[#7438dc]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
              {tab.showChevron && <ChevronRight className="size-3.5" />}
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
            {activeTab === "suggested" && "Suggested invoices will appear here."}
            {activeTab === "clients" && "Client management view coming soon."}
            {activeTab === "scanned" && "Scanned documents coming soon."}
            {activeTab === "payments" && "Online payments coming soon."}
            {activeTab === "reports" && "Reports & more coming soon."}
          </p>
          {activeTab === "clients" && (
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/clients-prospects")}
              className="mt-4 text-xs font-medium text-[#7438dc] hover:underline"
            >
              Go to Clients & Prospects
            </button>
          )}
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
              <span className="text-sm font-semibold text-zinc-800">Lifetime data</span>
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
                <option value="active">Active Invoice</option>
                <option value="all">All Invoices</option>
                <option value="paid">Paid Invoices</option>
                <option value="sent">Sent Invoices</option>
              </select>
              <span className="pointer-events-none -ml-7 flex items-center pr-2 text-zinc-400">
                <ChevronDown className="size-4" />
              </span>
            </div>

            <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toast.info("Download coming soon")}
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
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Select Invoice Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">Select</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Search client
                    </label>
                    <select
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">All Clients</option>
                      {clientOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Search contact
                    </label>
                    <select
                      value={filterContact}
                      onChange={(e) => setFilterContact(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                    >
                      <option value="">All Contacts</option>
                      {contactOptions.map((contact) => (
                        <option key={contact} value={contact}>
                          {contact}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Select date range
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

          {/* ── Invoice Summary ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">Invoice Summary</span>
              {summaryExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {summaryExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Invoice summary metrics coming soon.
              </div>
            )}
          </div>

          {/* ── Invoice Graph ── */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setGraphExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-zinc-800">Invoice Graph</span>
              {graphExpanded ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>
            {graphExpanded && (
              <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">
                Invoice graph coming soon.
              </div>
            )}
          </div>

        {/* Table toolbar top */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            Showing <strong>1 to {total}</strong> of <strong>{allTotal} Invoices</strong>
          </p>
          <ColumnToggle />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
              <Loader2 className="size-5 animate-spin" />
              Loading invoices…
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-red-500">
              Failed to load invoices.
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
              <FileText className="size-10 text-zinc-300" />
              <p className="text-sm">
                {allTotal === 0
                  ? "No invoices yet. Convert a sales order to create one."
                  : "No invoices match the current filters"}
              </p>
              {allTotal === 0 ? (
                <button
                  type="button"
                  onClick={() => router.push("/sales-and-invoices/invoice/new")}
                  className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
                >
                  Create New Invoice
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
              <table className="min-w-[2200px] w-full text-sm">
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
                    {columns.invoice && (
                      <th className={thClass}>
                        <span className="inline-flex items-center gap-1">
                          Invoice <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.billedTo && <th className={thClass}>Billed To</th>}
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
                    {columns.acceptance && (
                      <th className={thClass}>Acceptance Status</th>
                    )}
                    {columns.eInvoiceDetails && (
                      <th className={thClass}>E-invoice Details</th>
                    )}
                    {columns.eInvoiceAckNo && (
                      <th className={thClass}>E-invoice Ack No.</th>
                    )}
                    {columns.eInvoiceAckDate && (
                      <th className={thClass}>E-invoice Ack Date</th>
                    )}
                    {columns.eWayBillNo && (
                      <th className={thClass}>E-way Bill No.</th>
                    )}
                    {columns.eWayBillDate && (
                      <th className={thClass}>E-way Bill Date</th>
                    )}
                    {columns.eWayBillValidTill && (
                      <th className={thClass}>E-way Bill Valid Till</th>
                    )}
                    {columns.eInvoiceStatus && (
                      <th className={thClass}>
                        <span className="inline-flex items-center gap-1">
                          E-invoice Status <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.invoiceEmail && (
                      <th className={thClass}>Invoice Email</th>
                    )}
                    {columns.reverseCharge && (
                      <th className={thClass}>Reverse Charge Applicable</th>
                    )}
                    {columns.subTotal && (
                      <th className={`${thClass} text-right`}>
                        <span className="inline-flex items-center gap-1">
                          Sub Total <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.amountInr && (
                      <th className={`${thClass} text-right`}>
                        Invoice Amount in INR
                      </th>
                    )}
                    {columns.tags && <th className={thClass}>Tags</th>}
                    {columns.scannedDocument && (
                      <th className={thClass}>Scanned Document</th>
                    )}
                    {columns.workflowName && (
                      <th className={thClass}>Workflow Name</th>
                    )}
                    {columns.currentAssignee && (
                      <th className={thClass}>Current Assignee</th>
                    )}
                    {columns.currentStage && (
                      <th className={thClass}>Current Stage</th>
                    )}
                    {columns.currentStatus && (
                      <th className={thClass}>Current Status</th>
                    )}
                    {columns.actions && (
                      <th className={`${thClass} w-44`}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredInvoices.map((invoice, index) => {
                    const isOpen = expanded.has(invoice.id);
                    const badges = paymentBadges(invoice);

                    return (
                      <Fragment key={invoice.id}>
                        <tr
                          className="cursor-pointer bg-white hover:bg-zinc-50/80"
                          onClick={() =>
                            router.push(`/sales-and-invoices/documents/${invoice.id}`)
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
                          {columns.date && (
                            <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
                              {fmt(invoice.documentDate)}
                            </td>
                          )}
                          {columns.expand && (
                            <td
                              className="px-3 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => toggleExpand(invoice.id)}
                                className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50"
                              >
                                {isOpen ? "−" : "+"}
                              </button>
                            </td>
                          )}
                          {columns.invoice && (
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-zinc-900">
                                  {invoice.documentNumber}
                                </span>
                                {invoice.acceptanceStatus === "ACCEPTED" && (
                                  <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                    Accepted
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {columns.billedTo && (
                            <td className="px-3 py-2.5 text-zinc-700">
                              {invoice.billedTo || "—"}
                            </td>
                          )}
                          {columns.amount && (
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-zinc-900">
                              {formatCurrency(invoice.totalAmount, invoice.currency)}
                            </td>
                          )}
                          {columns.status && (
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-1">
                                {badges.map((badge) => (
                                  <span
                                    key={badge.label}
                                    className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                          {columns.paymentDate && (
                            <td className="px-3 py-2.5 text-zinc-700">
                              {fmt(invoice.paymentDate)}
                            </td>
                          )}
                          {columns.acceptance && (
                            <td className="px-3 py-2.5">
                              {invoice.acceptanceStatus === "ACCEPTED" ? (
                                <span className="inline-flex size-7 items-center justify-center text-emerald-600">
                                  <Check className="size-4" />
                                </span>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </td>
                          )}
                          {columns.eInvoiceDetails && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eInvoiceDetails ?? "—"}
                            </td>
                          )}
                          {columns.eInvoiceAckNo && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eInvoiceAckNo ?? "—"}
                            </td>
                          )}
                          {columns.eInvoiceAckDate && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eInvoiceAckDate
                                ? fmt(invoice.eInvoiceAckDate)
                                : "—"}
                            </td>
                          )}
                          {columns.eWayBillNo && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eWayBillNo ?? "—"}
                            </td>
                          )}
                          {columns.eWayBillDate && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eWayBillDate
                                ? fmt(invoice.eWayBillDate)
                                : "—"}
                            </td>
                          )}
                          {columns.eWayBillValidTill && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.eWayBillValidTill
                                ? fmt(invoice.eWayBillValidTill)
                                : "—"}
                            </td>
                          )}
                          {columns.eInvoiceStatus && (
                            <td className="px-3 py-2.5 text-zinc-600">
                              {invoice.eInvoiceStatus}
                            </td>
                          )}
                          {columns.invoiceEmail && (
                            <td
                              className="px-3 py-2.5 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {invoice.emailSent ? (
                                <span className="text-zinc-500">
                                  Sent {invoice.sentAt ? fmt(invoice.sentAt) : ""}
                                </span>
                              ) : (
                                <span className="text-zinc-500">
                                  Not Sent{" "}
                                  <button
                                    type="button"
                                    onClick={(e) => openEmail(invoice, e)}
                                    className="font-semibold text-[#7438dc] hover:underline"
                                  >
                                    [Send]
                                  </button>
                                </span>
                              )}
                            </td>
                          )}
                          {columns.reverseCharge && (
                            <td className="px-3 py-2.5 text-zinc-700">
                              {invoice.reverseCharge}
                            </td>
                          )}
                          {columns.subTotal && (
                            <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">
                              {formatCurrency(invoice.subTotal, invoice.currency)}
                            </td>
                          )}
                          {columns.amountInr && (
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-zinc-900">
                              {formatCurrency(invoice.totalAmount, invoice.currency)}
                            </td>
                          )}
                          {columns.tags && (
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-[#7438dc] hover:underline"
                              >
                                Add Tags
                              </button>
                            </td>
                          )}
                          {columns.scannedDocument && (
                            <td className="px-3 py-2.5 text-zinc-400">—</td>
                          )}
                          {columns.workflowName && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.workflowName}
                            </td>
                          )}
                          {columns.currentAssignee && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.currentAssignee}
                            </td>
                          )}
                          {columns.currentStage && (
                            <td className="px-3 py-2.5 text-zinc-400">
                              {invoice.currentStage}
                            </td>
                          )}
                          {columns.currentStatus && (
                            <td className="px-3 py-2.5 text-zinc-600">
                              {invoice.currentStatus}
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
                                      `/sales-and-invoices/documents/${invoice.id}`,
                                    )
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <Eye className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() =>
                                    router.push(
                                      `/sales-and-invoices/documents/${invoice.id}`,
                                    )
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Mark as paid"
                                  disabled={
                                    invoice.paymentStatus === "PAID" ||
                                    markPaidMutation.isPending
                                  }
                                  onClick={(e) => handleMarkPaid(invoice, e)}
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-600 disabled:opacity-40"
                                >
                                  <CheckCircle2 className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Copy invoice number"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      invoice.documentNumber,
                                    )
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <Copy className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={(e) => handleDelete(invoice, e)}
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
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
                                    <DropdownMenuItem
                                      onClick={() => openEmail(invoice)}
                                    >
                                      Email Invoice
                                    </DropdownMenuItem>
                                    {invoice.salesOrderId && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/sales-and-invoices/documents/${invoice.salesOrderId}`,
                                          )
                                        }
                                      >
                                        View Sales Order (
                                        {invoice.salesOrderNumber})
                                      </DropdownMenuItem>
                                    )}
                                    {invoice.paymentStatus !== "PAID" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          markPaidMutation.mutate(invoice.id)
                                        }
                                      >
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={(e) =>
                                        handleDelete(
                                          invoice,
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
                            <td colSpan={countCols()} className="px-4 py-3">
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
                                    {invoice.items.map((item) => (
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

        {/* Table toolbar bottom */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            Showing <strong>1 to {total}</strong> of <strong>{allTotal} Invoices</strong>
          </p>
          <ColumnToggle align="start" />
        </div>
        </div>
      )}

      {emailInvoice && (
        <EmailInvoiceSheet
          open={Boolean(emailInvoice)}
          onOpenChange={(open) => !open && setEmailInvoice(null)}
          invoice={emailInvoice}
        />
      )}
    </div>
  );
}
