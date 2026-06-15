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
  LinkIcon,
  MessageCircle,
  Mail,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
} from "lucide-react";

import { type QuotationRow } from "../components/quotation-form";
import {
  QuotationPreview,
  type BusinessSettingsRow,
} from "../components/quotation-preview";
import { QuotationSettingsPanel } from "../components/quotation-settings-panel";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { ActionMenu } from "../../clients-prospects/components/action-menu";
import { EmailQuotationSheet } from "../components/email-quotation-sheet";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { useConvertQuotation } from "@/lib/hooks/use-documents";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES, type DocumentTypeValue } from "@/lib/validations/document";
import { QuotationStatusBadge } from "@/components/quotations/quotation-status-badge";
import Link from "next/link";

// ─── Approval timeline ────────────────────────────────────────────────────────

function fmtDate(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type TimelineQuotation = QuotationRow & {
  sentAt?: string | null;
  viewedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  purchaseOrderCreatedAt?: string | null;
  rejectionReason?: string | null;
};

function ApprovalTimeline({
  quotation: q,
  convertedPurchaseOrder,
}: {
  quotation: TimelineQuotation;
  convertedPurchaseOrder?: { id: string; documentNumber: string } | null;
}) {
  return (
    <div className="mb-5 rounded-xl border border-zinc-200 bg-white px-5 py-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Approval Timeline
      </h3>
      <div className="space-y-2.5">
        {q.sentAt && (
          <div className="flex items-center gap-2.5 text-sm">
            <Send className="size-4 shrink-0 text-blue-500" />
            <span className="font-medium text-zinc-700">Sent</span>
            <span className="text-zinc-400">{fmtDate(q.sentAt)}</span>
          </div>
        )}
        {q.viewedAt && (
          <div className="flex items-center gap-2.5 text-sm">
            <Eye className="size-4 shrink-0 text-sky-500" />
            <span className="font-medium text-zinc-700">Viewed by client</span>
            <span className="text-zinc-400">{fmtDate(q.viewedAt)}</span>
          </div>
        )}
        {q.approvedAt && (
          <div className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span className="font-medium text-zinc-700">Approved</span>
            <span className="text-zinc-400">{fmtDate(q.approvedAt)}</span>
          </div>
        )}
        {q.purchaseOrderCreatedAt && (
          <div className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-purple-500" />
            <span className="font-medium text-zinc-700">Purchase Order Created</span>
            <span className="text-zinc-400">{fmtDate(q.purchaseOrderCreatedAt)}</span>
            {convertedPurchaseOrder && (
              <Link
                href={`/sales-and-invoices/documents/${convertedPurchaseOrder.id}`}
                className="text-xs font-medium text-[#7438dc] hover:underline"
              >
                #{convertedPurchaseOrder.documentNumber}
              </Link>
            )}
          </div>
        )}
        {q.rejectedAt && (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-sm">
              <XCircle className="size-4 shrink-0 text-red-500" />
              <span className="font-medium text-zinc-700">Rejected</span>
              <span className="text-zinc-400">{fmtDate(q.rejectedAt)}</span>
            </div>
            {q.rejectionReason && (
              <p className="ml-6 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {q.rejectionReason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default settings when a quotation has none yet ───────────────────────────

const DEFAULT_SETTINGS = DEFAULT_QUOTATION_SETTINGS;

const moreActions = [
  {
    label: "Create New Quotation",
    onClick: () => console.log("create"),
  },
  {
    label: "Send Via Email",
    onClick: () => console.log("create"),
  },
  {
    label: "Send Reminder by WhatsApp",
    onClick: () => console.log("whatsapp"),
  },
  {
    label: "Send Reminder by Email",
    onClick: () => console.log("email"),
  },
  {
    label: "Cancel Quotation",
    onClick: () => console.log("cancel"),
  },
  {
    label: "Delete Quotation",
    onClick: () => console.log("delete"),
  },
];

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
  const {
    data: quotationData,
    isLoading: qLoading,
    isError: qError,
  } = useQuery<{
    quotation: QuotationRow;
    convertedPurchaseOrder?: { id: string; documentNumber: string } | null;
  }>({
    queryKey: ["quotations", id],
    queryFn: () => fetch(`/api/quotations/${id}`).then((r) => r.json()),
  });

  const { data: bsData, isLoading: bsLoading } = useQuery<{
    settings: BusinessSettingsRow;
  }>({
    queryKey: ["business-settings"],
    queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
  });

  // ── Local settings state (seeded from quotation.settings) ──
  const quotation = quotationData?.quotation ?? null;
  const convertedPurchaseOrder = quotationData?.convertedPurchaseOrder ?? null;
  const [localSettings, setLocalSettings] =
    useState<QuotationSettings>(DEFAULT_SETTINGS);
  const [localBs, setLocalBs] = useState<BusinessSettingsRow>({});
  const [emailSheetOpen, setEmailSheetOpen] = useState(false)


  const shareActions = [
  {
    label: "Send Email",
    icon: <Mail className="size-4" />,
    onClick: () => setEmailSheetOpen(true),
  },
  {
    label: "Send WhatsApp",
    icon: <MessageCircle className="size-4 text-green-500" />,
    onClick: () => console.log("whatsapp"),
  },
  {
    label: "Copy Link",
    icon: <LinkIcon className="size-4" />,
    onClick: () => console.log("copy"),
  },
];

  // Seed once quotation and business settings arrive
  const settingsSeeded = useRef(false);
  useEffect(() => {
    if (!settingsSeeded.current && quotation?.settings) {
      setLocalSettings({
        ...DEFAULT_SETTINGS,
        ...(quotation.settings as Partial<QuotationSettings>),
      });
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

  // ── Document conversion ──
  const convertMutation = useConvertQuotation();
  function handleConvert(targetType: DocumentTypeValue) {
    convertMutation.mutate(
      { quotationId: id, targetType },
      {
        onSuccess: (res) => {
          router.push(`/sales-and-invoices/documents/${res.document.id}`);
        },
      },
    );
  }

  // ── Persist quotation settings (debounced) ──
  const persistSettingsTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
        if (persistSettingsTimer.current)
          clearTimeout(persistSettingsTimer.current);
        persistSettingsTimer.current = setTimeout(
          () => persistSettings.mutate(next),
          800,
        );
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
              onClick={() =>
                router.push("/sales-and-invoices/quotation-estimates")
              }
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() =>
                  router.push("/sales-and-invoices/quotation-estimates")
                }
              >
                Quotation
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">
                {quotation.quotationNumber}
              </span>
            </nav>
            <QuotationStatusBadge status={quotation.status} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                router.push("/sales-and-invoices/quotation-estimates/new")
              }
              className="flex items-center gap-1.5 rounded-lg bg-[#e6007b] px-3 py-2 text-sm font-medium text-white hover:bg-[#6330c2] transition-colors"
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
            <div className="mb-6 flex items-center justify-between">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/sales-and-invoices/quotation-estimates/${id}/edit`,
                    )
                  }
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-[#7438dc] px-3 py-2 text-sm font-medium text-[#7438dc] hover:bg-[#7438dc]/5 transition-colors"
                >
                  <Pencil className="size-4" />
                  Edit
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex  flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Printer className="size-4" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Printer className="size-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <ActionMenu
                  trigger={
                    <button
                      type="button"
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <Printer className="size-4" />
                      <span className="hidden sm:inline">Email / WhatsApp</span>
                    </button>
                  }
                  items={shareActions}
                />
                <ActionMenu
                  trigger={
                    <button
                      type="button"
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <Printer className="size-4" />
                      <span className="hidden sm:inline">More</span>
                    </button>
                  }
                  items={moreActions}
                />
                {quotation.status === "APPROVED" && (
                  <ActionMenu
                    trigger={
                      <button
                        type="button"
                        disabled={convertMutation.isPending}
                        className="flex flex-col items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">Convert</span>
                      </button>
                    }
                    items={DOCUMENT_TYPES.map((type) => ({
                      label: `Convert to ${DOCUMENT_TYPE_LABEL[type]}`,
                      onClick: () => handleConvert(type),
                    }))}
                    width="w-64"
                  />
                )}
              </div>
            </div>
            {/* ── Approval timeline (shown once quotation is sent) ── */}
            {(["SENT","VIEWED","APPROVED","REJECTED","PURCHASE_ORDER_CREATED"] as string[]).includes(quotation.status) && (
              <ApprovalTimeline
                quotation={quotation as TimelineQuotation}
                convertedPurchaseOrder={convertedPurchaseOrder}
              />
            )}

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
          <EmailQuotationSheet
            open={emailSheetOpen}
            onOpenChange={setEmailSheetOpen}
            quotation={quotation}
            quotationId={id}
            clientEmail={(quotationData?.quotation as (QuotationRow & { client?: { email?: string | null } | null }))?.client?.email}
          />
        </div>
      </div>
    </div>
  );
}
