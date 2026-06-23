"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  Columns3,
  Download,
  Eye,
  Filter,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Workflow,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useConvertVendorLead,
  useDeleteVendorLead,
  useUpdateVendorLeadWorkflow,
  useVendorLeads,
  type VendorLeadRow,
} from "@/lib/hooks/use-vendor-leads";
import {
  VENDOR_LEAD_WORKFLOW_STATUSES,
  type VendorLeadWorkflowInput,
} from "@/lib/validations/vendor-lead";
import { WorkflowAssignmentModal } from "./components/workflow-assignment-modal";

// ─── Column config ────────────────────────────────────────────────────────────

type ColumnKey =
  | "name"
  | "phone"
  | "email"
  | "country"
  | "workflowName"
  | "currentAssignee"
  | "currentStage"
  | "currentStatus"
  | "vendorType"
  | "gstNumber"
  | "panNumber"
  | "streetAddress"
  | "city"
  | "state"
  | "postalCode"
  | "subject"
  | "status";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  name: true,
  phone: true,
  email: true,
  country: true,
  workflowName: true,
  currentAssignee: true,
  currentStage: true,
  currentStatus: true,
  vendorType: false,
  gstNumber: false,
  panNumber: false,
  streetAddress: false,
  city: false,
  state: false,
  postalCode: false,
  subject: false,
  status: false,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  country: "Country",
  workflowName: "Workflow Name",
  currentAssignee: "Current Assignee",
  currentStage: "Current Stage",
  currentStatus: "Current Status",
  vendorType: "Vendor Type",
  gstNumber: "GSTIN",
  panNumber: "PAN",
  streetAddress: "Street",
  city: "City",
  state: "State",
  postalCode: "Pincode",
  subject: "Subject",
  status: "Lead Status",
};

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "Pending";
  const isApproved = s === "Approved" || s === "Onboarding";
  const isRejected = s === "Rejected";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        isApproved
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : isRejected
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-orange-50 text-orange-700 ring-orange-200"
      }`}
    >
      {s}
    </span>
  );
}

function workflowPayloadFromLead(
  lead: VendorLeadRow,
  overrides: Partial<VendorLeadWorkflowInput> = {},
): VendorLeadWorkflowInput {
  return {
    workflowName: lead.workflowName ?? "Vendor Onboarding",
    currentAssigneeId: lead.currentAssigneeId ?? undefined,
    currentStage:
      (lead.currentStage as VendorLeadWorkflowInput["currentStage"]) ??
      "Initial Contact",
    currentStatus:
      (lead.currentStatus as VendorLeadWorkflowInput["currentStatus"]) ??
      "Pending",
    ...overrides,
  };
}

function cellValue(lead: VendorLeadRow, key: ColumnKey): string {
  switch (key) {
    case "name":
      return lead.name;
    case "phone":
      return lead.phone ? `${lead.phoneCode ?? ""} ${lead.phone}`.trim() : "—";
    case "email":
      return lead.email ?? "—";
    case "country":
      return lead.country ?? "—";
    case "workflowName":
      return lead.workflowName ?? "—";
    case "currentAssignee":
      return lead.currentAssigneeName ?? "—";
    case "currentStage":
      return lead.currentStage ?? "—";
    case "currentStatus":
      return lead.currentStatus ?? "Pending";
    case "vendorType":
      return lead.vendorType === "INDIVIDUAL" ? "Individual" : "Company";
    case "gstNumber":
      return lead.gstNumber ?? "—";
    case "panNumber":
      return lead.panNumber ?? "—";
    case "streetAddress":
      return lead.streetAddress ?? "—";
    case "city":
      return lead.city ?? "—";
    case "state":
      return lead.state ?? "—";
    case "postalCode":
      return lead.postalCode ?? "—";
    case "subject":
      return lead.subject ?? "—";
    case "status":
      return lead.status;
    default:
      return "—";
  }
}

export default function VendorLeadsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [workflowLead, setWorkflowLead] = useState<VendorLeadRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const { data, isLoading, isError } = useVendorLeads({
    search,
    country: filterCountry || undefined,
    currentStage: filterStage || undefined,
    currentStatus: filterStatus || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const deleteMutation = useDeleteVendorLead();
  const convertMutation = useConvertVendorLead();
  const workflowMutation = useUpdateVendorLeadWorkflow();

  const leads = data?.vendorLeads ?? [];
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const visibleColumnKeys = useMemo(
    () => (Object.keys(columns) as ColumnKey[]).filter((k) => columns[k]),
    [columns],
  );

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  function downloadCSV() {
    if (leads.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = visibleColumnKeys.map((k) => COLUMN_LABELS[k]);
    const rows = leads.map((lead) =>
      visibleColumnKeys.map((k) => {
        const v = cellValue(lead, k);
        return `"${String(v).replace(/"/g, '""')}"`;
      }),
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete(lead: VendorLeadRow) {
    if (lead.status === "CONVERTED") {
      toast.error("Converted leads cannot be deleted");
      return;
    }
    if (!confirm(`Delete vendor lead "${lead.name}"?`)) return;
    deleteMutation.mutate(lead.id);
  }

  function handleConvert(lead: VendorLeadRow) {
    if (lead.status === "CONVERTED") {
      toast.info("Already converted");
      return;
    }
    if (!confirm(`Convert "${lead.name}" to an active vendor?`)) return;
    convertMutation.mutate(lead.id, {
      onSuccess: () => router.push("/purchases/vendors"),
    });
  }

  function handleWorkflowSubmit(payload: VendorLeadWorkflowInput) {
    if (!workflowLead) return;
    workflowMutation.mutate(
      { id: workflowLead.id, data: payload },
      { onSuccess: () => setWorkflowLead(null) },
    );
  }

  function handleQuickStatus(lead: VendorLeadRow, status: string) {
    workflowMutation.mutate({
      id: lead.id,
      data: workflowPayloadFromLead(lead, {
        currentStatus: status as VendorLeadWorkflowInput["currentStatus"],
      }),
    });
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-4 pt-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Purchases &amp; Expenses{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" />
          Vendor Leads Dashboard
        </nav>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-7 text-amber-400" />
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
              Your Vendor Leads
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/purchases/vendor-leads/new")}
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a]"
          >
            <Plus className="size-4" />
            Create Vendor Leads
          </button>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 sm:px-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="size-4" />
            Download CSV
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Columns3 className="size-4 text-[#7438dc]" />
                Show/Hide Columns
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search vendor leads…"
              className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
            />
          </div>
        </div>

        {/* Inline filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-zinc-400" />
          <select
            value={filterCountry}
            onChange={(e) => {
              setFilterCountry(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700"
          >
            <option value="">All Countries</option>
            {["India", "UAE", "USA", "UK", "Singapore"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700"
          >
            <option value="">All Stages</option>
            {[
              "Initial Contact",
              "Vendor Evaluation",
              "Negotiation",
              "Approval",
              "Onboarding",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700"
          >
            <option value="">All Statuses</option>
            {VENDOR_LEAD_WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <p className="text-sm text-zinc-500">
          Showing{" "}
          <strong className="text-zinc-700">
            {start} to {end}
          </strong>{" "}
          of <strong className="text-zinc-700">{total}</strong> vendor leads
        </p>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
              <Loader2 className="size-5 animate-spin text-[#7438dc]" />
              Loading vendor leads…
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-red-500">
              Failed to load vendor leads.
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
              <Lightbulb className="size-10 text-zinc-300" />
              <p className="text-sm">No vendor leads found.</p>
              <button
                type="button"
                onClick={() => router.push("/purchases/vendor-leads/new")}
                className="mt-2 flex items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4177a]"
              >
                <Plus className="size-4" />
                Create Vendor Leads
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <input type="checkbox" className="accent-[#7438dc]" disabled />
                    </th>
                    {columns.name && (
                      <Th filterable>Name</Th>
                    )}
                    {columns.phone && (
                      <Th filterable>Phone</Th>
                    )}
                    {columns.email && (
                      <Th filterable>Email</Th>
                    )}
                    {columns.country && (
                      <Th filterable>Country</Th>
                    )}
                    {columns.workflowName && <Th>Workflow Name</Th>}
                    {columns.currentAssignee && <Th>Current Assignee</Th>}
                    {columns.currentStage && <Th>Current Stage</Th>}
                    {columns.currentStatus && <Th>Current Status</Th>}
                    {columns.vendorType && <Th>Vendor Type</Th>}
                    {columns.gstNumber && <Th>GSTIN</Th>}
                    {columns.panNumber && <Th>PAN</Th>}
                    {columns.streetAddress && <Th>Street</Th>}
                    {columns.city && <Th>City</Th>}
                    {columns.state && <Th>State</Th>}
                    {columns.postalCode && <Th>Pincode</Th>}
                    {columns.subject && <Th>Subject</Th>}
                    {columns.status && <Th>Lead Status</Th>}
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {leads.map((lead) => {
                    const phone = lead.phone
                      ? `${lead.phoneCode ?? ""} ${lead.phone}`.trim()
                      : null;
                    const isConverted = lead.status === "CONVERTED";

                    return (
                      <tr key={lead.id} className="hover:bg-zinc-50/80">
                        <td className="px-3 py-3">
                          <input type="checkbox" className="accent-[#7438dc]" disabled />
                        </td>
                        {columns.name && (
                          <td
                            className="cursor-pointer px-3 py-3 font-medium text-zinc-900 hover:text-[#7438dc]"
                            onClick={() =>
                              router.push(`/purchases/vendor-leads/${lead.id}`)
                            }
                          >
                            {lead.name}
                          </td>
                        )}
                        {columns.phone && (
                          <td className="px-3 py-3">
                            {phone ? (
                              <a
                                href={`tel:${phone.replace(/\s/g, "")}`}
                                className="text-[#7438dc] underline underline-offset-2"
                              >
                                {phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {columns.email && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.email ?? "—"}
                          </td>
                        )}
                        {columns.country && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.country ?? "—"}
                          </td>
                        )}
                        {columns.workflowName && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.workflowName ?? "—"}
                          </td>
                        )}
                        {columns.currentAssignee && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.currentAssigneeName ?? "—"}
                          </td>
                        )}
                        {columns.currentStage && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.currentStage ?? "—"}
                          </td>
                        )}
                        {columns.currentStatus && (
                          <td className="px-3 py-3">
                            <StatusBadge status={lead.currentStatus} />
                          </td>
                        )}
                        {columns.vendorType && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.vendorType === "INDIVIDUAL" ? "Individual" : "Company"}
                          </td>
                        )}
                        {columns.gstNumber && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.gstNumber ?? "—"}
                          </td>
                        )}
                        {columns.panNumber && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.panNumber ?? "—"}
                          </td>
                        )}
                        {columns.streetAddress && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.streetAddress ?? "—"}
                          </td>
                        )}
                        {columns.city && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.city ?? "—"}
                          </td>
                        )}
                        {columns.state && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.state ?? "—"}
                          </td>
                        )}
                        {columns.postalCode && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.postalCode ?? "—"}
                          </td>
                        )}
                        {columns.subject && (
                          <td className="px-3 py-3 text-zinc-600">
                            {lead.subject ?? "—"}
                          </td>
                        )}
                        {columns.status && (
                          <td className="px-3 py-3 text-zinc-600">{lead.status}</td>
                        )}
                        <td className="px-3 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded p-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                              >
                                <MoreHorizontal className="size-4" />
                                More
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/purchases/vendor-leads/${lead.id}`)
                                }
                              >
                                <Eye className="mr-2 size-4" />
                                View
                              </DropdownMenuItem>
                              {!isConverted && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/purchases/vendor-leads/${lead.id}/edit`,
                                    )
                                  }
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {!isConverted && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setWorkflowLead(lead)}
                                  >
                                    <Workflow className="mr-2 size-4" />
                                    Add to Workflow
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setWorkflowLead(lead)}
                                  >
                                    <Workflow className="mr-2 size-4" />
                                    Change Workflow Stage
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      Update Status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {VENDOR_LEAD_WORKFLOW_STATUSES.map((s) => (
                                        <DropdownMenuItem
                                          key={s}
                                          onClick={() => handleQuickStatus(lead, s)}
                                        >
                                          {s}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleConvert(lead)}>
                                    <UserCheck className="mr-2 size-4" />
                                    Convert to Vendor
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleDelete(lead)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
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
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <WorkflowAssignmentModal
        open={workflowLead !== null}
        onClose={() => setWorkflowLead(null)}
        lead={workflowLead}
        onSubmit={handleWorkflowSubmit}
        isPending={workflowMutation.isPending}
      />
    </div>
  );
}

function Th({
  children,
  filterable,
}: {
  children: React.ReactNode;
  filterable?: boolean;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-zinc-500">
      <span className="inline-flex items-center gap-1">
        {children}
        {filterable && <Filter className="size-3 opacity-40" />}
      </span>
    </th>
  );
}
