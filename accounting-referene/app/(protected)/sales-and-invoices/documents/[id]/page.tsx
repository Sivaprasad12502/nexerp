"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Printer,
} from "lucide-react";

import { useDocument } from "@/lib/hooks/use-documents";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";
import {
  QuotationPreview,
  type BusinessSettingsRow,
} from "../../quotation-estimates/components/quotation-preview";
import { QuotationSettingsPanel } from "../../quotation-estimates/components/quotation-settings-panel";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { ActionMenu } from "../../clients-prospects/components/action-menu";
import { EmailDocumentSheet } from "../components/email-document-sheet";
import { DOCUMENT_TYPE_LABEL, type DocumentTypeValue } from "@/lib/validations/document";

// ─── Status badge ─────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentViewPage({
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

  // ── Local design state (seeded once from the fetched doc) ──
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

  // ── Page-size / margin → @page CSS ──
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
        <p>Document not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/documents")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  const doc = data.document;
  const typeLabel =
    DOCUMENT_TYPE_LABEL[doc.type as DocumentTypeValue] ?? doc.type;
  const adapted = adaptDocumentToQuotationRow(doc, typeLabel);

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

  // Client email from DocumentDetail
  const clientEmail =
    (doc as { client?: { email?: string | null } | null })?.client?.email;

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
              onClick={() => router.push("/sales-and-invoices/documents")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/sales-and-invoices/documents")}
              >
                Documents
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">
                {doc.documentNumber}
              </span>
            </nav>
            <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {typeLabel}
            </span>
            <DocumentStatusBadge status={doc.status} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
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
                  <Mail className="size-4" />
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
                  <MoreHorizontal className="size-4" />
                  <span className="hidden sm:inline">More</span>
                </button>
              }
              items={moreActions}
            />
          </div>
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
                documentLabel={typeLabel}
              />
            </div>
          </div>

          {/* Right: Settings sidebar */}
          <div className="w-[340px] flex-shrink-0 sticky top-[73px]">
            <QuotationSettingsPanel
              settings={localSettings}
              onSettingsChange={handleSettingsChange}
              businessSettings={localBs}
              onBusinessSettingsChange={handleBsChange}
              documentLabel={typeLabel}
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
        documentLabel={typeLabel}
      />
    </div>
  );
}
