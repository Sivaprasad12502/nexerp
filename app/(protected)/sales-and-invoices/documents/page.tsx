"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import { useDocuments, type DocumentListItem } from "@/lib/hooks/use-documents";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL,
  type DocumentTypeValue,
} from "@/lib/validations/document";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    INVOICE:          "bg-violet-100 text-violet-700",
    PURCHASE_ORDER:   "bg-blue-100 text-blue-700",
    SALES_ORDER:      "bg-sky-100 text-sky-700",
    PROFORMA_INVOICE: "bg-amber-100 text-amber-700",
    DELIVERY_CHALLAN: "bg-emerald-100 text-emerald-700",
  };
  const label = DOCUMENT_TYPE_LABEL[type as DocumentTypeValue] ?? type;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] ?? "bg-zinc-100 text-zinc-600"}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "ISSUED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "CANCELLED"
      ? "bg-zinc-100 text-zinc-500"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onClick,
}: {
  doc: DocumentListItem;
  onClick: () => void;
}) {
  const displayName =
    doc.client?.businessName ?? doc.clientName ?? "—";

  return (
    <tr
      className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
      onClick={onClick}
    >
      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
        {doc.documentNumber}
      </td>
      <td className="px-4 py-3">
        <TypeBadge type={doc.type} />
      </td>
      <td className="px-4 py-3 text-sm text-zinc-700">{displayName}</td>
      <td className="px-4 py-3 text-sm text-zinc-500">{fmt(doc.documentDate)}</td>
      <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">
        {fmtAmount(doc.totalAmount, doc.currency)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={doc.status} />
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabValue = "ALL" | DocumentTypeValue;
const TABS: { value: TabValue; label: string }[] = [
  { value: "ALL", label: "All" },
  ...DOCUMENT_TYPES.map((t) => ({ value: t as TabValue, label: DOCUMENT_TYPE_LABEL[t] })),
];

export default function DocumentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("ALL");
  const { data, isLoading } = useDocuments({
    type: activeTab === "ALL" ? undefined : activeTab,
  });

  const documents = data?.documents ?? [];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Documents</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Invoices, purchase orders, and other documents converted from quotations.
          </p>
        </div>

        {/* Type filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-[#7438dc] text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-[#7438dc] hover:text-[#7438dc]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="divide-y divide-zinc-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-100" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-100" />
                  <div className="h-4 flex-1 animate-pulse rounded-full bg-zinc-100" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-zinc-50">
                <FileText className="size-8 text-zinc-300" />
              </div>
              <p className="text-base font-medium text-zinc-700">No documents yet</p>
              <p className="text-sm text-zinc-400">
                Convert an approved quotation to create your first document.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Number
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Client
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onClick={() =>
                        router.push(`/sales-and-invoices/documents/${doc.id}`)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
