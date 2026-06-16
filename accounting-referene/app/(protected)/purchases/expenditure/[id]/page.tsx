"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  CreditCard,
  Clock,
} from "lucide-react";

import { useDocument } from "@/lib/hooks/use-documents";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";
import {
  QuotationPreview,
  type BusinessSettingsRow,
} from "../../../sales-and-invoices/quotation-estimates/components/quotation-preview";
import { QuotationSettingsPanel } from "../../../sales-and-invoices/quotation-estimates/components/quotation-settings-panel";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { ActionMenu } from "../../../sales-and-invoices/clients-prospects/components/action-menu";
import { EmailDocumentSheet } from "../../../sales-and-invoices/documents/components/email-document-sheet";

const DOCUMENT_LABEL = "Expenditure";

// ─── Status badge ──────────────────────────────────────────────────────────────

function DocumentStatusBadge({ status }: { status: string }) {
  const style =
    status === "ISSUED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "CANCELLED"
        ? "bg-zinc-100 text-zinc-500"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ExpenditureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  // ── Data fetches ──
  const { data, isLoading, isError } = useDocument(id);

  const { data: bsData, isLoading: bsLoading } = useQuery<{
    settings: BusinessSettingsRow;
  }>({
    queryKey: ["business-settings"],
    queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
  });

  // ── Local design state (seeded once) ──
  const [localSettings, setLocalSettings] =
    useState<QuotationSettings>(DEFAULT_QUOTATION_SETTINGS);
  const [localBs, setLocalBs] = useState<BusinessSettingsRow>({});
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);

  const settingsSeeded = useRef(false);
  useEffect(() => {
    if (!settingsSeeded.current && data?.document?.settings) {
      setLocalSettings({
        ...DEFAULT_QUOTATION_SETTINGS,
        ...(data.document.settings as Partial<QuotationSettings>),
      });
      settingsSeeded.current = true;
    }
  }, [data]);

  const bsSeeded = useRef(false);
  useEffect(() => {
    if (!bsSeeded.current && bsData?.settings) {
      setLocalBs(bsData.settings);
      bsSeeded.current = true;
    }
  }, [bsData]);

  // ── Persist document settings (debounced) ──
  const persistSettingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSettings = useMutation({
    mutationFn: (s: QuotationSettings) =>
      fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", id] }),
  });

  const handleSettingsChange = useCallback(
    (patch: Partial<QuotationSettings>) => {
      setLocalSettings((prev) => {
        const next = { ...prev, ...patch };
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

  // ── Page size / margin → @page CSS ──
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

  // ── Loading / error states ──
  if (isLoading || bsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.document) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-zinc-500">
        <p>Expenditure not found.</p>
        <button
          type="button"
          onClick={() => router.push("/purchases/expenditure")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Purchases &amp; Expenses
        </button>
      </div>
    );
  }

  const doc = data.document;
  const adapted = adaptDocumentToQuotationRow(doc, DOCUMENT_LABEL);

  // ── Share actions ──
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

  const moreActions = [
    { label: "Print / Download PDF", onClick: () => window.print() },
    { label: "Send Via Email", onClick: () => setEmailSheetOpen(true) },
  ];

  const clientEmail =
    (doc as { client?: { email?: string | null } | null })?.client?.email;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* Dynamic print styles */}
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
          {/* Left: breadcrumb + step indicator */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/purchases/expenditure")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/purchases/expenditure")}
              >
                Purchase and Expense
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">
                {doc.documentNumber}
              </span>
            </nav>
            <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {DOCUMENT_LABEL}
            </span>
            <DocumentStatusBadge status={doc.status} />
          </div>

          {/* Right: create button */}
          <button
            type="button"
            onClick={() => router.push("/purchases/expenditure")}
            className="flex items-center gap-1.5 rounded-md bg-[#e8145a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c91050] transition-colors"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">+ Create New Purchase and Expense</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="mx-auto mt-3 flex max-w-[1400px] items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              <Check className="size-3" />
            </span>
            <span className="text-sm font-medium text-zinc-500">Add Purchase Details</span>
          </div>
          <ChevronRight className="size-4 text-zinc-300" />
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              2
            </span>
            <span className="text-sm font-semibold text-zinc-900">Customise &amp; Share</span>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="mx-auto mt-3 flex max-w-[1400px] flex-wrap items-center gap-2">
          {/* Edit — stub */}
          <button
            type="button"
            disabled
            title="Edit (coming soon)"
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-400 opacity-50 cursor-not-allowed"
          >
            <Pencil className="size-4" />
            <span>Edit</span>
          </button>

          {/* Record Payment — stub */}
          <button
            type="button"
            onClick={() => toast.info("Record Payment — coming soon")}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <CreditCard className="size-4" />
            <span>Record Payment</span>
          </button>

          {/* Will Pay Later — stub */}
          <button
            type="button"
            onClick={() => toast.info("Will Pay Later — coming soon")}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Clock className="size-4" />
            <span>Will Pay Later</span>
          </button>

          <div className="mx-1 h-8 w-px bg-zinc-200" />

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Printer className="size-4" />
            <span>Print / PDF</span>
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Printer className="size-4" />
            <span>Download</span>
          </button>

          {/* Email / WhatsApp */}
          <ActionMenu
            trigger={
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Mail className="size-4" />
                <span>Email / WhatsApp</span>
              </button>
            }
            items={shareActions}
          />

          {/* More */}
          <ActionMenu
            trigger={
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <MoreHorizontal className="size-4" />
                <span>More</span>
              </button>
            }
            items={moreActions}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="flex gap-6 items-start">
          {/* Left: Document preview */}
          <div className="flex-1 overflow-auto">
            <div className="quotation-print-area">
              <QuotationPreview
                quotation={adapted}
                businessSettings={localBs}
                settings={localSettings}
                documentLabel={DOCUMENT_LABEL}
              />
            </div>
          </div>

          {/* Right: Settings sidebar */}
          <div className="w-[340px] flex-shrink-0 sticky top-[160px]">
            <QuotationSettingsPanel
              settings={localSettings}
              onSettingsChange={handleSettingsChange}
              businessSettings={localBs}
              onBusinessSettingsChange={handleBsChange}
              documentLabel={DOCUMENT_LABEL}
            />
          </div>
        </div>
      </div>

      {/* Email sheet */}
      <EmailDocumentSheet
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        document={adapted}
        documentId={id}
        clientEmail={clientEmail}
        documentLabel={DOCUMENT_LABEL}
      />
    </div>
  );
}
