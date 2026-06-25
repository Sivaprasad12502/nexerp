"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, FileText, Eye, Pencil, Copy, MoreVertical, Check, Columns3,
  ArrowUpDown, Trash2, Filter, ChevronDown, ChevronUp, ChevronRight, X, Plus,
  Lightbulb, Download,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/document-adapter";
import { useDebitNotes, useDeleteDebitNote, type DebitNoteRow } from "@/lib/hooks/use-debit-notes";
import { EmailDebitNoteSheet } from "./components/email-debit-note-sheet";

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadges(debitNote: DebitNoteRow) {
  const s = debitNote.status.toUpperCase();
  if (s === "CANCELLED") return [{ label: "Cancelled", className: "bg-zinc-100 text-zinc-600 ring-zinc-200" }];
  if (s === "DRAFT") return [{ label: "Draft", className: "bg-blue-50 text-blue-700 ring-blue-200" }];
  return [{ label: "Issued", className: "bg-orange-50 text-orange-700 ring-orange-200" }];
}

type ColumnKey =
  | "date" | "expand" | "debitNote" | "issuedTo" | "debitIssued" | "status"
  | "taxRate" | "acceptance" | "debitNoteEmail" | "debitConsumed" | "amountDue"
  | "subTotal" | "amountAed" | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true, expand: true, debitNote: true, issuedTo: true, debitIssued: true,
  status: true, taxRate: true, acceptance: true, debitNoteEmail: true, debitConsumed: true,
  amountDue: true, subTotal: true, amountAed: true, actions: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date", expand: "Expand Line Items", debitNote: "Debit Note", issuedTo: "Issued To",
  debitIssued: "Debit Issued", status: "Status", taxRate: "TAX Rate", acceptance: "Acceptance Status",
  debitNoteEmail: "Debit Note Email", debitConsumed: "Debit Consumed", amountDue: "Amount Due",
  subTotal: "Sub Total", amountAed: "Debit Note Amount in AED", actions: "Actions",
};

type ViewMode = "active" | "all" | "sent";
type Tab = "overview" | "tagReport";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tagReport", label: "Tag-wise Report" },
];

const thClass = "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-[#7438dc] ring-1 ring-purple-200">
      {label}
      <button type="button" onClick={onClear}><X className="size-2.5" /></button>
    </span>
  );
}

function CollapsibleSection({
  title, expanded, onToggle, children,
}: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
        <span className="text-sm font-semibold text-zinc-800">{title}</span>
        {expanded ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
      </button>
      {expanded && <div className="border-t border-zinc-100 px-5 py-6 text-center text-sm text-zinc-400">{children}</div>}
    </div>
  );
}

function LineItemsTable({ items }: { items: DebitNoteRow["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            {["Item Name", "Hsn/Sac", "Sku ID", "Tax Rate", "Quantity", "Rate", "Sub Total", "Total"].map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium text-zinc-500 ${i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {items.map((item) => (
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
  );
}

export default function DebitNotesPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useDebitNotes();
  const deleteMutation = useDeleteDebitNote();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [emailDebitNote, setEmailDebitNote] = useState<DebitNoteRow | null>(null);
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

  const hasFilters = !!(filterStatus || filterClient || filterContact || filterDateStart || filterDateEnd);
  const clearFilters = () => {
    setFilterStatus(""); setFilterClient(""); setFilterContact("");
    setFilterDateStart(""); setFilterDateEnd("");
  };

  const allDebitNotes = data?.debitNotes ?? [];

  const clientOptions = useMemo(
    () => Array.from(new Set(allDebitNotes.map((cn) => cn.issuedTo).filter(Boolean))).sort(),
    [allDebitNotes],
  );
  const contactOptions = useMemo(
    () => Array.from(new Set(allDebitNotes.map((dn) => dn.clientEmail ?? dn.issuedTo).filter(Boolean) as string[])).sort(),
    [allDebitNotes],
  );

  const filteredDebitNotes = useMemo(() => {
    let result = allDebitNotes;
    if (viewMode === "active") result = result.filter((cn) => cn.status.toUpperCase() !== "CANCELLED");
    if (viewMode === "sent") result = result.filter((cn) => cn.emailSent);
    if (filterStatus === "issued") result = result.filter((cn) => cn.status.toUpperCase() === "ISSUED");
    if (filterStatus === "draft") result = result.filter((cn) => cn.status.toUpperCase() === "DRAFT");
    if (filterStatus === "cancelled") result = result.filter((cn) => cn.status.toUpperCase() === "CANCELLED");
    if (filterStatus === "sent") result = result.filter((cn) => cn.emailSent);
    if (filterClient) result = result.filter((dn) => dn.issuedTo === filterClient);
    if (filterContact) result = result.filter((dn) => (dn.clientEmail ?? dn.issuedTo) === filterContact || dn.issuedTo === filterContact);
    if (filterDateStart) {
      const from = new Date(filterDateStart).getTime();
      result = result.filter((cn) => new Date(cn.documentDate).getTime() >= from);
    }
    if (filterDateEnd) {
      const to = new Date(filterDateEnd).getTime() + 86399999;
      result = result.filter((cn) => new Date(cn.documentDate).getTime() <= to);
    }
    return result;
  }, [allDebitNotes, viewMode, filterStatus, filterClient, filterContact, filterDateStart, filterDateEnd]);

  const total = filteredDebitNotes.length;
  const allTotal = allDebitNotes.length;

  const toggleExpand = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleColumn = (key: ColumnKey) => setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  const openEmail = (debitNote: DebitNoteRow, e?: React.MouseEvent) => { e?.stopPropagation(); setEmailDebitNote(debitNote); };
  const handleDelete = (debitNote: DebitNoteRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete debit note ${debitNote.documentNumber}?`)) return;
    deleteMutation.mutate(debitNote.id);
  };
  const handleTabClick = (tab: Tab) => {
    if (tab === "tagReport") { toast.info("Tag-wise Report coming soon"); return; }
    setActiveTab(tab);
  };
  const countCols = () => 2 + (Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).filter((k) => columns[k]).length;
  const goToDoc = (id: string) => router.push(`/purchases/debit-note/${id}`);

  const ColumnToggle = ({ align = "end" }: { align?: "start" | "end" }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
          <Columns3 className="size-3.5" /> Show/Hide Columns
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="max-h-80 w-56 overflow-y-auto">
        {(Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).map((key) => (
          <DropdownMenuCheckboxItem key={key} checked={columns[key]} onCheckedChange={() => toggleColumn(key)}>
            {COLUMN_LABELS[key]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SortTh = ({ label, right }: { label: string; right?: boolean }) => (
    <th className={`${thClass}${right ? " text-right" : ""}`}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="size-3 opacity-40" /></span>
    </th>
  );

  const RowActions = ({ debitNote }: { debitNote: DebitNoteRow }) => (
    <div className="flex items-center gap-1">
      <button type="button" title="View" onClick={() => goToDoc(debitNote.id)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><Eye className="size-4" /></button>
      <button type="button" title="Edit" onClick={() => router.push(`/purchases/debit-note/${debitNote.id}/edit`)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><Pencil className="size-4" /></button>
      <button type="button" title="Copy" onClick={() => navigator.clipboard.writeText(debitNote.documentNumber)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><Copy className="size-4" /></button>
      <button type="button" title="Delete" onClick={(e) => handleDelete(debitNote, e)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"><Trash2 className="size-4" /></button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><MoreVertical className="size-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEmail(debitNote)}>Email Debit Note</DropdownMenuItem>
          {debitNote.linkedInvoiceId && (
            <DropdownMenuItem onClick={() => router.push(`/sales-and-invoices/documents/${debitNote.linkedInvoiceId}`)}>
              View Linked Invoice{debitNote.linkedInvoiceNumber ? ` (${debitNote.linkedInvoiceNumber})` : ""}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => handleDelete(debitNote, e as unknown as React.MouseEvent)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <p className="mb-1 text-xs text-zinc-400">apporg <span className="mx-1">›</span> Debit Notes <span className="mx-1">›</span></p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">Debit Notes <Lightbulb className="size-5 text-amber-400" /></h1>
          <div className="flex items-stretch overflow-hidden rounded-md shadow-sm">
            <button type="button" onClick={() => router.push("/purchases/debit-note/new")} className="flex items-center gap-2 bg-[#e8145a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c91050]">
              <Plus className="size-4" /> Create Debit Note
            </button>
            <button type="button" className="border-l border-[#c91050] bg-[#e8145a] px-2 py-2 text-white hover:bg-[#c91050]" aria-label="More options"><ChevronDown className="size-4" /></button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-0">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => handleTabClick(tab.id)}
              className={`mr-6 flex items-center gap-0.5 border-b-2 pb-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-[#7438dc] text-[#7438dc]" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
              {tab.label}{tab.id === "tagReport" && <ChevronRight className="size-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== "overview" ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
          <FileText className="mb-3 size-10 text-zinc-300" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="mt-1 text-xs">Tag-wise report coming soon.</p>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-6">
          <CollapsibleSection title="Lifetime Data" expanded={lifetimeExpanded} onToggle={() => setLifetimeExpanded((v) => !v)}>
            Lifetime summary metrics coming soon.
          </CollapsibleSection>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)} className="appearance-none bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-700 outline-none">
                <option value="active">Active Debit Note</option>
                <option value="all">All</option>
                <option value="sent">Sent</option>
              </select>
              <span className="pointer-events-none -ml-7 flex items-center pr-2 text-zinc-400"><ChevronDown className="size-4" /></span>
            </div>
            <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
              <button type="button" onClick={() => toast.info("Download coming soon")} className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                <Download className="size-4" /> Download As
              </button>
              <button type="button" className="border-l border-zinc-200 px-2 py-2 text-zinc-400 hover:bg-zinc-50"><ChevronDown className="size-4" /></button>
            </div>
          </div>

          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3">
              <button type="button" onClick={() => setFiltersExpanded((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                <ChevronDown className={`size-4 text-zinc-500 ${filtersExpanded ? "" : "-rotate-90"}`} />
                <Filter className="size-3.5 text-zinc-500" /> Filters
              </button>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="ml-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500">
                  <X className="size-3" /> Clear All
                </button>
              )}
            </div>
            {filtersExpanded && (
              <div className="border-t border-zinc-100 px-5 pb-4 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Debit Note Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]">
                      <option value="">Select</option>
                      <option value="issued">Issued</option><option value="draft">Draft</option>
                      <option value="cancelled">Cancelled</option><option value="sent">Sent</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Select Client</label>
                    <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]">
                      <option value="">All Clients</option>
                      {clientOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Search Contact</label>
                    <select value={filterContact} onChange={(e) => setFilterContact(e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#7438dc]">
                      <option value="">All Contacts</option>
                      {contactOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Date range</label>
                    <div className="flex h-9 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2">
                      <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="flex-1 border-0 bg-transparent text-xs text-zinc-700 outline-none" />
                      <span className="text-xs text-zinc-300">–</span>
                      <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="flex-1 border-0 bg-transparent text-xs text-zinc-700 outline-none" />
                    </div>
                  </div>
                </div>
                {hasFilters && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Applied Filters:</span>
                    {filterStatus && <FilterChip label={`Status: ${filterStatus}`} onClear={() => setFilterStatus("")} />}
                    {filterClient && <FilterChip label={`Client: ${filterClient}`} onClear={() => setFilterClient("")} />}
                    {filterContact && <FilterChip label={`Contact: ${filterContact}`} onClear={() => setFilterContact("")} />}
                    {(filterDateStart || filterDateEnd) && (
                      <FilterChip label={`Date: ${filterDateStart || "…"} – ${filterDateEnd || "…"}`} onClear={() => { setFilterDateStart(""); setFilterDateEnd(""); }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <CollapsibleSection title="Debit Note Summary" expanded={summaryExpanded} onToggle={() => setSummaryExpanded((v) => !v)}>
            Debit note summary metrics coming soon.
          </CollapsibleSection>
          <CollapsibleSection title="Debit Note Graph" expanded={graphExpanded} onToggle={() => setGraphExpanded((v) => !v)}>
            Debit note graph coming soon.
          </CollapsibleSection>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">Showing <strong>1 to {total}</strong> of <strong>{allTotal} Debit Notes</strong></p>
            <ColumnToggle />
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-zinc-500"><Loader2 className="size-5 animate-spin" /> Loading debit notes…</div>
            ) : isError ? (
              <div className="py-20 text-center text-sm text-red-500">Failed to load debit notes.</div>
            ) : filteredDebitNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
                <FileText className="size-10 text-zinc-300" />
                <p className="text-sm">{allTotal === 0 ? "No debit notes yet. Create one to get started." : "No debit notes match the current filters"}</p>
                {allTotal === 0 ? (
                  <button type="button" onClick={() => router.push("/purchases/debit-note/new")} className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]">Create Debit Note</button>
                ) : (
                  <button type="button" onClick={clearFilters} className="text-xs text-[#7438dc] hover:underline">Clear all filters</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1800px] w-full text-sm">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-10`}><input type="checkbox" className="accent-[#7438dc]" /></th>
                      <th className={`${thClass} w-8`}>#</th>
                      {columns.date && <SortTh label="Date" />}
                      {columns.expand && <th className={thClass}>+ Expand Line Items</th>}
                      {columns.debitNote && <SortTh label="Debit Note" />}
                      {columns.issuedTo && <th className={thClass}>Issued To</th>}
                      {columns.debitIssued && <SortTh label="Debit Issued" right />}
                      {columns.status && <SortTh label="Status" />}
                      {columns.taxRate && <th className={thClass}>TAX Rate</th>}
                      {columns.acceptance && <th className={thClass}>Acceptance Status</th>}
                      {columns.debitNoteEmail && <th className={thClass}>Debit Note Email</th>}
                      {columns.debitConsumed && <th className={`${thClass} text-right`}>Debit Consumed</th>}
                      {columns.amountDue && <th className={`${thClass} text-right`}>Amount Due</th>}
                      {columns.subTotal && <SortTh label="Sub Total" right />}
                      {columns.amountAed && <th className={`${thClass} text-right`}>Debit Note Amount in AED</th>}
                      {columns.actions && <th className={`${thClass} w-44`}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredDebitNotes.map((debitNote, index) => {
                      const isOpen = expanded.has(debitNote.id);
                      const badges = statusBadges(debitNote);
                      const fc = (n: number) => formatCurrency(n, debitNote.currency);
                      return (
                        <Fragment key={debitNote.id}>
                          <tr className="cursor-pointer bg-white hover:bg-zinc-50/80" onClick={() => goToDoc(debitNote.id)}>
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="accent-[#7438dc]" /></td>
                            <td className="px-3 py-2.5 text-xs text-zinc-500">{index + 1}</td>
                            {columns.date && <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">{fmt(debitNote.documentDate)}</td>}
                            {columns.expand && (
                              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => toggleExpand(debitNote.id)} className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50">{isOpen ? "−" : "+"}</button>
                              </td>
                            )}
                            {columns.debitNote && <td className="px-3 py-2.5"><span className="font-medium text-zinc-900">{debitNote.documentNumber}</span></td>}
                            {columns.issuedTo && <td className="px-3 py-2.5 text-zinc-700">{debitNote.issuedTo || "—"}</td>}
                            {columns.debitIssued && <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-zinc-900">{fc(debitNote.debitIssued)}</td>}
                            {columns.status && (
                              <td className="px-3 py-2.5">
                                {badges.map((b) => <span key={b.label} className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${b.className}`}>{b.label}</span>)}
                              </td>
                            )}
                            {columns.taxRate && <td className="px-3 py-2.5 text-zinc-700">{debitNote.taxRate}</td>}
                            {columns.acceptance && (
                              <td className="px-3 py-2.5">
                                {debitNote.acceptanceStatus === "ACCEPTED" ? <Check className="size-4 text-emerald-600" /> : <span className="text-zinc-300">—</span>}
                              </td>
                            )}
                            {columns.debitNoteEmail && (
                              <td className="px-3 py-2.5 text-xs" onClick={(e) => e.stopPropagation()}>
                                {debitNote.emailSent ? (
                                  <span className="text-zinc-500">Sent {debitNote.sentAt ? fmt(debitNote.sentAt) : ""}</span>
                                ) : (
                                  <span className="text-zinc-500">Not Sent <button type="button" onClick={(e) => openEmail(debitNote, e)} className="font-semibold text-[#7438dc] hover:underline">[Send]</button></span>
                                )}
                              </td>
                            )}
                            {columns.debitConsumed && <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">{fc(debitNote.debitConsumed)}</td>}
                            {columns.amountDue && <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">{fc(debitNote.amountDue)}</td>}
                            {columns.subTotal && <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">{fc(debitNote.subTotal)}</td>}
                            {columns.amountAed && <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-zinc-900">{fc(debitNote.totalAmount)}</td>}
                            {columns.actions && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><RowActions debitNote={debitNote} /></td>}
                          </tr>
                          {isOpen && columns.expand && (
                            <tr className="bg-zinc-50/60">
                              <td colSpan={countCols()} className="px-4 py-3"><LineItemsTable items={debitNote.items} /></td>
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">Showing <strong>1 to {total}</strong> of <strong>{allTotal} Debit Notes</strong></p>
            <ColumnToggle align="start" />
          </div>
        </div>
      )}

      {emailDebitNote && (
        <EmailDebitNoteSheet
          open={Boolean(emailDebitNote)}
          onOpenChange={(open: boolean) => !open && setEmailDebitNote(null)}
          debitNote={emailDebitNote}
        />
      )}
    </div>
  );
}
