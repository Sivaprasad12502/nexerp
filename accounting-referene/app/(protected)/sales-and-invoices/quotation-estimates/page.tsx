"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationStatus = "DRAFT" | "SAVED" | "CANCELLED";

type QuotationListItem = {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validTillDate: string | null;
  currency: string;
  totalAmount: number;
  status: QuotationStatus;
  clientName: string | null;
  client: { id: string; businessName: string; logo: string | null } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: QuotationStatus }) {
  const map: Record<QuotationStatus, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600",
    SAVED: "bg-green-50 text-green-700 ring-1 ring-green-200",
    CANCELLED: "bg-red-50 text-red-600 ring-1 ring-red-200",
  };
  const label: Record<QuotationStatus, string> = {
    DRAFT: "Draft",
    SAVED: "Saved",
    CANCELLED: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotationEstimatesPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<QuotationStatus>("DRAFT");
  const [search, setSearch] = useState("");

  // ── Fetch ──
  const { data, isLoading } = useQuery<{ quotations: QuotationListItem[] }>({
    queryKey: ["quotations", tab, search],
    queryFn: () =>
      fetch(
        `/api/quotations?status=${tab}&search=${encodeURIComponent(search)}`,
      ).then((r) => r.json()),
  });

  const quotations = data?.quotations ?? [];

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/quotations/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Quotation deleted");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: () => toast.error("Failed to delete quotation"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/quotations/${id}/duplicate`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (body) => {
      toast.success("Quotation duplicated");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      router.push(`/sales-and-invoices/quotation-estimates/${body.quotation.id}/edit`);
    },
    onError: () => toast.error("Failed to duplicate quotation"),
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-0 pt-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Sales &amp; Invoices <ChevronRight className="mx-0.5 inline size-3.5" /> Quotations
        </nav>

        <div className="mt-1 flex items-end justify-between gap-4 pb-4">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
            Quotations &amp; Estimates
          </h1>
          <button
            type="button"
            onClick={() => router.push("/sales-and-invoices/quotation-estimates/new")}
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a]"
          >
            <Plus className="size-4" />
            New Quotation
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-0">
          {(["DRAFT", "SAVED", "CANCELLED"] as QuotationStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={`mr-6 border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === s
                  ? "border-[#6d28d9] text-[#6d28d9]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {s === "DRAFT" ? "Drafts" : s === "SAVED" ? "Saved" : "Cancelled"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-6 py-5 sm:px-8">
        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotations…"
              className="w-60 rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        )}

        {/* Empty state */}
        {!isLoading && quotations.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white py-20 text-center">
            <FileText className="mb-3 size-10 text-zinc-300" />
            <p className="font-medium text-zinc-700">No quotations yet</p>
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/quotation-estimates/new")}
              className="mt-4 flex items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4177a]"
            >
              <Plus className="size-4" />
              Create First Quotation
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && quotations.length > 0 && (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Quotation #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Valid Till
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Client
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Status
                    </th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {quotations.map((q) => (
                    <tr
                      key={q.id}
                      className="cursor-pointer hover:bg-zinc-50/80"
                      onClick={() =>
                        router.push(
                          `/sales-and-invoices/quotation-estimates/${q.id}/edit`,
                        )
                      }
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {q.quotationNumber}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {fmt(q.quotationDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {fmt(q.validTillDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {q.client?.businessName ?? q.clientName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap">
                        {q.currency} {q.totalAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            >
                              <span className="sr-only">Actions</span>
                              <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="3" r="1.2" />
                                <circle cx="8" cy="8" r="1.2" />
                                <circle cx="8" cy="13" r="1.2" />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/sales-and-invoices/quotation-estimates/${q.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(q.id)}
                            >
                              <Copy className="mr-2 size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Delete "${q.quotationNumber}"?`)) {
                                  deleteMutation.mutate(q.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
              Showing{" "}
              <strong className="text-zinc-700">{quotations.length}</strong>{" "}
              {quotations.length === 1 ? "quotation" : "quotations"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
