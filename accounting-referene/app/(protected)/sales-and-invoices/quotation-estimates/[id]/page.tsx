"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Loader2,
  Pencil,
  Printer,
  Plus,
  ArrowLeft,
} from "lucide-react";

import { type QuotationRow } from "../components/quotation-form";
import { QuotationPreview, type BusinessSettingsRow } from "../components/quotation-preview";
import { QuotationSettingsPanel } from "../components/quotation-settings-panel";
import type { QuotationSettings } from "@/lib/validations/quotation";

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "DRAFT" | "SAVED" | "CANCELLED" }) {
  const map = {
    DRAFT:     "bg-amber-100 text-amber-700",
    SAVED:     "bg-green-100 text-green-700",
    CANCELLED: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status === "SAVED" ? "Created" : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Default settings when a quotation has none yet ───────────────────────────

const DEFAULT_SETTINGS: QuotationSettings = {
  displayUnitAs: "mergeWithQuantity",
  showTaxSummary: false,
  hideCountryOfSupply: false,
  addOriginalImages: false,
  showThumbnails: false,
  showFullWidthDescription: false,
  hideSubtotalForGroups: false,
  showSku: false,
  showSerialNumbers: false,
  showBatchDetails: false,
  showHsnSummary: false,
  template: "professional",
  themeColor: "#7438dc",
  fontFamily: "inter",
  pageSize: "A4",
  margin: "normal",
  numberFormat: "en-IN",
  showLetterhead: false,
  showFooter: false,
  showWatermark: false,
  watermarkOpacity: 0.15,
  showBankDetails: false,
  showUpiDetails: false,
  showBatchSummary: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotationViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  // ── Data fetches ──
  const { data: quotationData, isLoading: qLoading, isError: qError } =
    useQuery<{ quotation: QuotationRow }>({
      queryKey: ["quotations", id],
      queryFn: () => fetch(`/api/quotations/${id}`).then((r) => r.json()),
    });

  const { data: bsData, isLoading: bsLoading } =
    useQuery<{ settings: BusinessSettingsRow }>({
      queryKey: ["business-settings"],
      queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
    });

  // ── Local settings state (seeded from quotation.settings) ──
  const quotation = quotationData?.quotation ?? null;
  const [localSettings, setLocalSettings] = useState<QuotationSettings>(DEFAULT_SETTINGS);
  const [localBs, setLocalBs] = useState<BusinessSettingsRow>({});

  // Seed once quotation and business settings arrive
  const settingsSeeded = useRef(false);
  useEffect(() => {
    if (!settingsSeeded.current && quotation?.settings) {
      setLocalSettings({ ...DEFAULT_SETTINGS, ...(quotation.settings as Partial<QuotationSettings>) });
      settingsSeeded.current = true;
    }
  }, [quotation]);

  const bsSeeded = useRef(false);
  useEffect(() => {
    if (!bsSeeded.current && bsData?.settings) {
      setLocalBs(bsData.settings);
      bsSeeded.current = true;
    }
  }, [bsData]);

  // ── Persist quotation settings (debounced) ──
  const persistSettingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSettings = useMutation({
    mutationFn: (s: QuotationSettings) =>
      fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations", id] }),
  });

  const handleSettingsChange = useCallback(
    (patch: Partial<QuotationSettings>) => {
      setLocalSettings((prev) => {
        const next = { ...prev, ...patch };
        // Debounce the server persist
        if (persistSettingsTimer.current) clearTimeout(persistSettingsTimer.current);
        persistSettingsTimer.current = setTimeout(() => persistSettings.mutate(next), 800);
        return next;
      });
    },
    [persistSettings],
  );

  // ── Persist business settings (debounced) ──
  const persistBsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistBs = useMutation({
    mutationFn: (patch: Partial<BusinessSettingsRow>) =>
      fetch("/api/business-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings"] }),
  });

  const handleBsChange = useCallback(
    (patch: Partial<BusinessSettingsRow>) => {
      setLocalBs((prev) => {
        const next = { ...prev, ...patch };
        if (persistBsTimer.current) clearTimeout(persistBsTimer.current);
        persistBsTimer.current = setTimeout(() => persistBs.mutate(patch), 800);
        return next;
      });
    },
    [persistBs],
  );

  // ── Page size → @page CSS ──
  const pageSizeMap: Record<string, string> = {
    A4: "A4",
    Letter: "letter",
    Legal: "legal",
    A5: "A5",
  };
  const marginMap: Record<string, string> = {
    normal: "20mm",
    narrow: "10mm",
    wide: "30mm",
  };

  // ── States ──
  if (qLoading || bsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (qError || !quotation) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-zinc-500">
        <p>Quotation not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/quotation-estimates")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Quotations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* Dynamic print-style injection */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .quotation-print-area,
          .quotation-print-area * { visibility: visible !important; }
          .quotation-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
          }
        }
        @page {
          size: ${pageSizeMap[localSettings.pageSize] ?? "A4"};
          margin: ${marginMap[localSettings.margin] ?? "20mm"};
        }
      `}</style>

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/quotation-estimates")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/sales-and-invoices/quotation-estimates")}
              >
                Quotation
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">{quotation.quotationNumber}</span>
            </nav>
            <StatusBadge status={quotation.status} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/sales-and-invoices/quotation-estimates/${id}/edit`)}
              className="flex items-center gap-1.5 rounded-lg border border-[#7438dc] px-3 py-2 text-sm font-medium text-[#7438dc] hover:bg-[#7438dc]/5 transition-colors"
            >
              <Pencil className="size-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/quotation-estimates/new")}
              className="flex items-center gap-1.5 rounded-lg bg-[#7438dc] px-3 py-2 text-sm font-medium text-white hover:bg-[#6330c2] transition-colors"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create New Quotation</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="flex gap-6 items-start">
          {/* Left: Document preview — scrollable */}
          <div className="flex-1 overflow-auto">
            <QuotationPreview
              quotation={quotation}
              businessSettings={localBs}
              settings={localSettings}
            />
          </div>

          {/* Right: Settings sidebar */}
          <div className="w-[340px] flex-shrink-0 sticky top-[73px]">
            <QuotationSettingsPanel
              settings={localSettings}
              onSettingsChange={handleSettingsChange}
              businessSettings={localBs}
              onBusinessSettingsChange={handleBsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
