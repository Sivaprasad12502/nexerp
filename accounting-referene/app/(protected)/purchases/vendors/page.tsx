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
  RotateCcw,
  ChevronRight,
  Building2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VendorRow } from "./components/vendor-form";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SourceBadge({ linkedBusinessId }: { linkedBusinessId: string | null }) {
  if (linkedBusinessId) {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
        Auto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
      Manual
    </span>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "ARCHIVED" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "ACTIVE"
          ? "bg-green-50 text-green-700"
          : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {status === "ACTIVE" ? "Active" : "Archived"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ vendors: VendorRow[] }>({
    queryKey: ["vendors", tab, search],
    queryFn: () =>
      fetch(`/api/vendors?status=${tab}&search=${encodeURIComponent(search)}`)
        .then((r) => r.json()),
  });
  const vendors = data?.vendors ?? [];

  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/vendors/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Vendor archived");
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => toast.error("Failed to archive vendor"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Vendor restored");
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => toast.error("Failed to restore vendor"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/vendors/${id}/permanent`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Vendor permanently deleted");
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => toast.error("Failed to delete vendor"),
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-0 pt-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Purchases &amp; Expenses <ChevronRight className="mx-0.5 inline size-3.5" /> Vendors
        </nav>
        <div className="mt-1 flex items-end justify-between gap-4 pb-4">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
            Vendors
          </h1>
          <button
            type="button"
            onClick={() => router.push("/purchases/vendors/new")}
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a]"
          >
            <Plus className="size-4" />
            Add Vendor
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {(["ACTIVE", "ARCHIVED"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`mr-5 shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-[#6d28d9] text-[#6d28d9]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t === "ACTIVE" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-6 py-5 sm:px-8">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        )}

        {/* Empty */}
        {!isLoading && vendors.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white py-20 text-center">
            <Building2 className="mb-3 size-10 text-zinc-300" />
            <p className="font-medium text-zinc-700">No vendors yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              Vendors are auto-added when you approve a quotation, or you can add one manually.
            </p>
            <button
              type="button"
              onClick={() => router.push("/purchases/vendors/new")}
              className="mt-4 flex items-center gap-2 rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4177a]"
            >
              <Plus className="size-4" />
              Add Vendor
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && vendors.length > 0 && (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">GST No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Added</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {vendors.map((v) => (
                    <tr
                      key={v.id}
                      className="cursor-pointer hover:bg-zinc-50/80"
                      onClick={() => router.push(`/purchases/vendors/${v.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">{v.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{v.email ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{v.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{v.gstNumber ?? "—"}</td>
                      <td className="px-4 py-3">
                        <SourceBadge linkedBusinessId={v.linkedBusinessId} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                        {fmt(v.createdAt)}
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
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {tab === "ACTIVE" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/purchases/vendors/${v.id}/edit`)
                                  }
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm(`Archive "${v.name}"?`)) {
                                      archiveMutation.mutate(v.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => restoreMutation.mutate(v.id)}
                                >
                                  <RotateCcw className="mr-2 size-4" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Permanently delete "${v.name}"? This cannot be undone.`,
                                      )
                                    ) {
                                      deleteMutation.mutate(v.id);
                                    }
                                  }}
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
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
              Showing <strong className="text-zinc-700">{vendors.length}</strong>{" "}
              {vendors.length === 1 ? "vendor" : "vendors"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
