"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Columns3,
  Download,
  Eye,
  Filter,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import {
  useDeletePayoutReceipt,
  usePayoutReceipts,
  type PayoutReceiptRow,
} from "@/lib/hooks/use-payout-receipts";
import { RecordNewPayoutModal } from "./components/record-new-payout-modal";
import { PayoutReceiptMoreMenu } from "./components/payout-receipt-more-menu";
import { SettledExpendituresExpandRow } from "./components/settled-expenditures-expand-row";

type ColumnKey =
  | "date"
  | "expand"
  | "receipt"
  | "vendor"
  | "amount"
  | "status"
  | "email"
  | "shopify"
  | "signature"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  expand: true,
  receipt: true,
  vendor: true,
  amount: true,
  status: true,
  email: true,
  shopify: true,
  signature: true,
  actions: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  expand: "+ Expand Expenditures",
  receipt: "Payout Receipt",
  vendor: "Vendor",
  amount: "Amount",
  status: "Status",
  email: "Payout Receipt Email",
  shopify: "Shopify Order Number",
  signature: "Signature Status",
  actions: "Actions",
};

const PAGE_SIZE = 20;

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const isSettled = status === "SETTLED";
  const isAdvance = status === "ADVANCE";
  const isDraft = status === "DRAFT";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        isSettled
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : isAdvance
            ? "bg-orange-50 text-orange-700 ring-orange-200"
            : isDraft
              ? "bg-violet-50 text-violet-700 ring-violet-200"
              : "bg-zinc-100 text-zinc-600 ring-zinc-200"
      }`}
    >
      {isSettled ? "Settled" : isAdvance ? "Advance" : isDraft ? "Draft" : status}
    </span>
  );
}

export default function PayoutReceiptsPage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "report">("overview");
  const [view, setView] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deleteMutation = useDeletePayoutReceipt();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data, isLoading, isError } = usePayoutReceipts({
    search,
    status: filterStatus || undefined,
    vendorId: filterClientId || undefined,
    dateFrom: filterDateStart || undefined,
    dateTo: filterDateEnd || undefined,
    view,
    page,
    limit: PAGE_SIZE,
    sortBy: "receiptDate",
    sortDir: "desc",
  });

  const { data: vendorsData } = useQuery<{
    vendors: { id: string; name: string }[];
  }>({
    queryKey: ["vendors", "ACTIVE"],
    queryFn: () => fetch("/api/vendors?status=ACTIVE").then((r) => r.json()),
  });

  const receipts = data?.payoutReceipts ?? [];
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const vendors = vendorsData?.vendors ?? [];

  const visibleKeys = useMemo(
    () => (Object.keys(columns) as ColumnKey[]).filter((k) => columns[k]),
    [columns],
  );

  const toggleColumn = (key: ColumnKey) =>
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterClientId("");
    setFilterDateStart("");
    setFilterDateEnd("");
    setPage(1);
  };

  const hasFilters =
    filterStatus || filterClientId || filterDateStart || filterDateEnd;

  function downloadCSV() {
    if (receipts.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = visibleKeys
      .filter((k) => k !== "expand" && k !== "actions")
      .map((k) => COLUMN_LABELS[k]);
    const rows = receipts.map((r) =>
      visibleKeys
        .filter((k) => k !== "expand" && k !== "actions")
        .map((k) => {
          if (k === "date") return fmt(r.receiptDate);
          if (k === "receipt") return r.receiptNumber;
          if (k === "vendor") return r.vendorName ?? "";
          if (k === "amount")
            return formatReceiptAmount(r.totalAmount, {
              currency: r.currency,
              numberFormat: r.numberFormat,
              decimalDigits: r.decimalDigits,
              customCurrencySymbol: r.customCurrencySymbol,
            });
          if (k === "status") return r.displayStatus;
          if (k === "email") return r.emailSent ? "Sent" : "Not Sent";
          return "";
        }),
    );
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      <div className="border-b border-zinc-200 bg-white px-6 pb-0 pt-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Sales &amp; Purchases <ChevronRight className="mx-0.5 inline size-3.5" />
          Payout Receipts
        </nav>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-7 text-amber-400" />
            <h1 className="text-[28px] font-bold text-zinc-900">Payout Receipts</h1>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a]"
          >
            <Plus className="size-4" />
            Create Payout Receipt
          </button>
        </div>
        <div className="flex gap-6 border-b border-zinc-100">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`border-b-2 pb-3 text-sm font-medium ${
              tab === "overview"
                ? "border-[#7438dc] text-[#7438dc]"
                : "border-transparent text-zinc-500"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("report")}
            className={`border-b-2 pb-3 text-sm font-medium ${
              tab === "report"
                ? "border-[#7438dc] text-[#7438dc]"
                : "border-transparent text-zinc-500"
            }`}
          >
            Tag-wise Report
          </button>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 sm:px-8">
        {tab === "report" ? (
          <div className="rounded-lg border border-zinc-200 bg-white py-20 text-center text-sm text-zinc-400">
            Tag-wise report coming soon.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={view}
                onChange={(e) => {
                  setView(e.target.value as "active" | "all");
                  setPage(1);
                }}
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="active">Active Payout Receipt</option>
                <option value="all">All Payout Receipts</option>
              </select>
              <button
                type="button"
                onClick={downloadCSV}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <Download className="size-4" />
                Download CSV
              </button>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search receipts…"
                className="ml-auto h-10 w-56 rounded-md border border-zinc-200 px-3 text-sm"
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white">
              <div className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="flex flex-1 items-center justify-between hover:text-zinc-900"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="size-4" />
                    Filters
                  </span>
                  {filtersOpen ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-3 shrink-0 text-xs text-[#7438dc] hover:underline"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
              {filtersOpen && (
                <div className="grid gap-3 border-t border-zinc-100 p-4 sm:grid-cols-4">
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SETTLED">Settled</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                  <select
                    value={filterClientId}
                    onChange={(e) => {
                      setFilterClientId(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                  >
                    <option value="">All Vendors</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={filterDateStart}
                    onChange={(e) => {
                      setFilterDateStart(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                  />
                  <input
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => {
                      setFilterDateEnd(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Showing <strong>{start} to {end}</strong> of{" "}
                <strong>{total}</strong> Payout Receipts
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium"
                  >
                    <Columns3 className="size-3.5" />
                    Show/Hide Columns
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="size-6 animate-spin text-[#7438dc]" />
                </div>
              ) : isError ? (
                <p className="py-20 text-center text-sm text-red-500">Failed to load.</p>
              ) : receipts.length === 0 ? (
                <p className="py-20 text-center text-sm text-zinc-400">No payout receipts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                      <tr>
                        <th className="w-10 px-3 py-3">
                          <input type="checkbox" className="accent-[#7438dc]" disabled />
                        </th>
                        <th className="w-8 px-3 py-3">#</th>
                        {columns.date && <th className="px-3 py-3 text-left">Date</th>}
                        {columns.expand && <th className="px-3 py-3 text-left">+ Expand Expenditures</th>}
                        {columns.receipt && <th className="px-3 py-3 text-left">Payout Receipt</th>}
                        {columns.vendor && <th className="px-3 py-3 text-left">Vendor</th>}
                        {columns.amount && <th className="px-3 py-3 text-right">Amount</th>}
                        {columns.status && <th className="px-3 py-3 text-left">Status</th>}
                        {columns.email && <th className="px-3 py-3 text-left">Payout Receipt Email</th>}
                        {columns.shopify && <th className="px-3 py-3 text-left">Shopify Order Number</th>}
                        {columns.signature && <th className="px-3 py-3 text-left">Signature Status</th>}
                        {columns.actions && <th className="px-3 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {receipts.map((r, idx) => (
                        <ReceiptRow
                          key={r.id}
                          receipt={r}
                          index={start + idx}
                          columns={columns}
                          expanded={expanded.has(r.id)}
                          onToggleExpand={() => toggleExpand(r.id)}
                          onView={() => router.push(`/purchases/payout-reciept/${r.id}`)}
                          onEdit={() => router.push(`/purchases/payout-reciept/${r.id}/edit`)}
                          onDelete={() => {
                            if (confirm(`Delete receipt ${r.receiptNumber}?`)) {
                              deleteMutation.mutate(r.id);
                            }
                          }}
                          onSendEmail={() =>
                            router.push(
                              `/purchases/payout-reciept/${r.id}?email=1`,
                            )
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border border-zinc-200 px-3 py-1 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-zinc-200 px-3 py-1 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <RecordNewPayoutModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSelect={(type) => {
          setCreateModalOpen(false);
          const q = type === "VENDOR_ADVANCE" ? "?type=vendor-advance" : "?type=payout-receipt";
          router.push(`/purchases/payout-reciept/new${q}`);
        }}
      />
    </div>
  );
}

function ReceiptRow({
  receipt,
  index,
  columns,
  expanded,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
}: {
  receipt: PayoutReceiptRow;
  index: number;
  columns: Record<ColumnKey, boolean>;
  expanded: boolean;
  onToggleExpand: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
}) {
  const router = useRouter();
  const amount = formatReceiptAmount(receipt.totalAmount, {
    currency: receipt.currency,
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
  });

  const colSpan =
    2 + (Object.keys(columns) as ColumnKey[]).filter((k) => columns[k]).length;

  return (
    <Fragment>
      <tr className="hover:bg-zinc-50/80">
        <td className="px-3 py-3">
          <input type="checkbox" className="accent-[#7438dc]" disabled />
        </td>
        <td className="px-3 py-3 text-zinc-500">{index}</td>
        {columns.date && <td className="px-3 py-3">{fmt(receipt.receiptDate)}</td>}
        {columns.expand && (
          <td className="px-3 py-3">
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-lg font-bold text-zinc-500 hover:text-[#7438dc]"
            >
              {expanded ? "−" : "+"}
            </button>
          </td>
        )}
        {columns.receipt && (
          <td
            className="cursor-pointer px-3 py-3 font-medium text-zinc-900 hover:text-[#7438dc]"
            onClick={onView}
          >
            {receipt.receiptNumber}
          </td>
        )}
        {columns.vendor && (
          <td className="px-3 py-3">
            {receipt.vendorId && receipt.vendorName ? (
              <button
                type="button"
                onClick={() => router.push(`/purchases/vendors/${receipt.vendorId}`)}
                className="text-left text-[#7438dc] hover:underline"
              >
                {receipt.vendorName}
              </button>
            ) : (
              receipt.vendorName ?? "—"
            )}
          </td>
        )}
        {columns.amount && <td className="px-3 py-3 text-right font-medium">{amount}</td>}
        {columns.status && (
          <td className="px-3 py-3">
            <StatusBadge status={receipt.displayStatus} />
          </td>
        )}
        {columns.email && (
          <td className="px-3 py-3">
            {receipt.emailSent ? (
              "Sent"
            ) : (
              <button
                type="button"
                onClick={onSendEmail}
                className="text-[#7438dc] hover:underline"
              >
                Not Sent (Send)
              </button>
            )}
          </td>
        )}
        {columns.shopify && <td className="px-3 py-3">—</td>}
        {columns.signature && <td className="px-3 py-3">—</td>}
        {columns.actions && (
          <td className="px-3 py-3">
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onView} className="p-1.5 text-zinc-500 hover:text-zinc-800">
                <Eye className="size-4" />
              </button>
              <button type="button" onClick={onEdit} className="p-1.5 text-zinc-500 hover:text-zinc-800">
                <Pencil className="size-4" />
              </button>
              <PayoutReceiptMoreMenu
                receipt={receipt}
                onDelete={onDelete}
                onSendEmail={onSendEmail}
              />
            </div>
          </td>
        )}
      </tr>
      {expanded && (
        <SettledExpendituresExpandRow receipt={receipt} colSpan={colSpan} />
      )}
    </Fragment>
  );
}
