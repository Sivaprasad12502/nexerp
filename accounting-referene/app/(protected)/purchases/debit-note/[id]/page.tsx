"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  CreditCard,
  LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
} from "lucide-react";

import { useDocument } from "@/lib/hooks/use-documents";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";
import {
  RecordPaymentModal,
  type PendingPayment,
  type InvoiceSummary,
} from "../../../sales-and-invoices/documents/components/record-payment-modal";
import {
  QuotationPreview,
  type BusinessSettingsRow,
} from "../../../sales-and-invoices/quotation-estimates/components/quotation-preview";
import { QuotationSettingsPanel } from "../../../sales-and-invoices/quotation-estimates/components/quotation-settings-panel";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { ActionMenu } from "../../../sales-and-invoices/clients-prospects/components/action-menu";
import { EmailDocumentSheet } from "../../../sales-and-invoices/documents/components/email-document-sheet";

const DOCUMENT_LABEL = "Debit Note";

function DocumentStatusBadge({ status }: { status: string }) {
  const style =
    status === "ISSUED"
      ? "bg-orange-100 text-orange-700"
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

export default function DebitNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useDocument(id);

  const { data: bsData, isLoading: bsLoading } = useQuery<{
    settings: BusinessSettingsRow;
  }>({
    queryKey: ["business-settings"],
    queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
  });

  const [localSettings, setLocalSettings] =
    useState<QuotationSettings>(DEFAULT_QUOTATION_SETTINGS);
  const [localBs, setLocalBs] = useState<BusinessSettingsRow>({});
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  const { data: paymentsData } = useQuery<{
    payments: PendingPayment[];
  }>({
    queryKey: ["document-payments", id],
    queryFn: () => fetch(`/api/documents/${id}/payments`).then((r) => r.json()),
    enabled: Boolean(data?.document),
  });

  const handleRecordPaymentClick = () => {
    const firstPending = paymentsData?.payments?.find((p) => p.status === "PENDING");
    setPendingPayment(firstPending ?? null);
    setPaymentModalOpen(true);
  };

  // Auto-open from ?payment= deep-link (email approval link)
  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpenDone.current) return;
    const paymentId = searchParams.get("payment");
    if (!paymentId || !paymentsData?.payments) return;
    const match = paymentsData.payments.find(
      (p) => p.id === paymentId && p.status === "PENDING",
    );
    if (match) {
      autoOpenDone.current = true;
      setPendingPayment(match as PendingPayment);
      setPaymentModalOpen(true);
    }
  }, [searchParams, paymentsData]);

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

  const persistSettingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSettings = useMutation({
    mutationFn: (s: QuotationSettings) =>
      fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", id] });
      qc.invalidateQueries({ queryKey: ["debit-notes"] });
    },
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
        <p>Debit note not found.</p>
        <button
          type="button"
          onClick={() => router.push("/purchases/debit-note")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Debit Notes
        </button>
      </div>
    );
  }

  const doc = data.document;
  const adapted = adaptDocumentToQuotationRow(doc, DOCUMENT_LABEL);
  const docSettings =
    typeof doc.settings === "object" && doc.settings !== null
      ? (doc.settings as Record<string, unknown>)
      : {};
  const approvedTotal = (paymentsData?.payments ?? [])
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amountReceived, 0);
  const isPaid =
    docSettings.paymentStatus === "PAID" ||
    (approvedTotal > 0 && approvedTotal >= doc.totalAmount);

  const invoiceSummary: InvoiceSummary = {
    documentNumber: doc.documentNumber,
    clientName: doc.clientName ?? null,
    subTotal: doc.subTotal,
    totalAmount: doc.totalAmount,
    currency: doc.currency,
  };

  const clientEmail =
    (doc as { client?: { email?: string | null } | null })?.client?.email ??
    (typeof doc.settings === "object" &&
    doc.settings !== null &&
    typeof (doc.settings as { clientEmail?: string }).clientEmail === "string"
      ? (doc.settings as { clientEmail: string }).clientEmail
      : null);

  const shareActions = [
    {
      label: "Send Email",
      icon: <Mail className="size-4" />,
      onClick: () => setEmailSheetOpen(true),
    },
    {
      label: "Send WhatsApp",
      icon: <MessageCircle className="size-4 text-green-500" />,
      onClick: () => {},
    },
    {
      label: "Copy Link",
      icon: <LinkIcon className="size-4" />,
      onClick: () => {},
    },
  ];

  const moreActions = [
    { label: "Print / Download PDF", onClick: () => window.print() },
    { label: "Send Via Email", onClick: () => setEmailSheetOpen(true) },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
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

      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/purchases/debit-note")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/purchases/debit-note")}
              >
                Debit Notes
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">
                {doc.documentNumber}
              </span>
            </nav>
            <DocumentStatusBadge status={doc.status} />
            {isPaid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-3" />
                Paid
              </span>
            )}
            {!isPaid && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                Unpaid
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/purchases/debit-note/new")}
            className="flex items-center gap-1.5 rounded-md bg-[#e8145a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c91050] transition-colors"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create Debit Note</span>
          </button>
        </div>

        <div className="mx-auto mt-3 flex max-w-[1400px] items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              <Check className="size-3" />
            </span>
            <span className="text-sm font-medium text-zinc-500">Debit Note Details</span>
          </div>
          <ChevronRight className="size-4 text-zinc-300" />
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              2
            </span>
            <span className="text-sm font-semibold text-zinc-900">Design &amp; Share</span>
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-[1400px] flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/purchases/debit-note/${id}/edit`)}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="size-4" />
            <span>Edit</span>
          </button>

          <div className="mx-1 h-8 w-px bg-zinc-200" />

          {isPaid ? (
            <button
              type="button"
              disabled
              className="flex flex-col items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 cursor-default"
            >
              <CreditCard className="size-4" />
              <span>Paid</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRecordPaymentClick}
              className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <CreditCard className="size-4" />
              <span>Record Payment</span>
            </button>
          )}

          <div className="mx-1 h-8 w-px bg-zinc-200" />

          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Printer className="size-4" />
            <span>Print / PDF</span>
          </button>

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

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="flex gap-6 items-start">
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

      <EmailDocumentSheet
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        document={adapted}
        documentId={id}
        clientEmail={clientEmail}
        documentLabel={DOCUMENT_LABEL}
      />

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        documentId={id}
        payment={pendingPayment}
        invoice={invoiceSummary}
        onApproved={() => {
          qc.invalidateQueries({ queryKey: ["documents", id] });
          qc.invalidateQueries({ queryKey: ["document-payments", id] });
          qc.invalidateQueries({ queryKey: ["debit-notes"] });
        }}
      />
    </div>
  );
}
