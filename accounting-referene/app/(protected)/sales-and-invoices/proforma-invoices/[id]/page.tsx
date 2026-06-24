"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
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
import { EmailProformaDocumentSheet } from "../components/email-proforma-document-sheet";
import {
  DOCUMENT_TYPE_LABEL,
  type DocumentTypeValue,
} from "@/lib/validations/document";
import {
  RecordPaymentModal,
  type PendingPayment,
  type InvoiceSummary,
} from "../components/record-payment-modal";
import { usePaymentAccounts } from "@/lib/hooks/use-payment-accounts";

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

export default function ProformaInvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // ── Data fetches ──
  const { data, isLoading, isError } = useDocument(id);

  const { data: bsData, isLoading: bsLoading } = useQuery<{
    settings: BusinessSettingsRow;
  }>({
    queryKey: ["business-settings"],
    queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
  });

  // Payment accounts (for bank/UPI selection reflection)
  const { data: paymentAccountsData } = usePaymentAccounts();

  // ── Payment state ──
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(
    null,
  );

  // Fetch payments for this document (enabled only for invoices)
  const isProforma = data?.document?.type === "PROFORMA_INVOICE";

  const { data: paymentsData } = useQuery<{
    payments: PendingPayment[];
  }>({
    queryKey: ["document-payments", id],
    queryFn: () => fetch(`/api/proforma-invoices/${id}/payments`).then((r) => r.json()),
    enabled: isProforma,
  });

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

  const handleRecordPaymentClick = () => {
    // If there's a pending payment, show it in the modal; otherwise open for direct recording
    const firstPending = paymentsData?.payments?.find(
      (p) => p.status === "PENDING",
    );
    setPendingPayment(firstPending ?? null);
    setPaymentModalOpen(true);
  };

  // ── Local design state (seeded once from the fetched doc) ──
  const [localSettings, setLocalSettings] = useState<QuotationSettings>(
    DEFAULT_QUOTATION_SETTINGS,
  );
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
  const persistSettingsTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const persistSettings = useMutation({
    mutationFn: (s: QuotationSettings) =>
      fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proforma-invoices"] }),
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

  // ── Loading/error states ──
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
          onClick={() => router.push("/sales-and-invoices/proforma-invoices")}
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

  // Derive paid status from approved payments or document settings
  const approvedTotal = (paymentsData?.payments ?? [])
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amountReceived, 0);
  const docSettings =
    typeof doc.settings === "object" && doc.settings !== null
      ? (doc.settings as Record<string, unknown>)
      : {};
  const isPaid =
    docSettings.paymentStatus === "PAID" ||
    (isProforma && approvedTotal > 0 && approvedTotal >= doc.totalAmount);

  const invoiceSummary: InvoiceSummary = {
    documentNumber: doc.documentNumber,
    clientName: doc.clientName ?? null,
    subTotal: doc.subTotal,
    totalAmount: doc.totalAmount,
    currency: doc.currency,
  };

  // ── Reflect selected bank/UPI from bank-details step into the preview ──
  const effectiveBs = (() => {
    const allAccounts = paymentAccountsData?.accounts ?? [];
    const selectedBankId = docSettings.selectedPaymentAccountId as
      | string
      | null
      | undefined;
    const selectedUpiId = docSettings.selectedUpiAccountId as
      | string
      | null
      | undefined;
    const bankAcct = selectedBankId
      ? allAccounts.find((a) => a.id === selectedBankId)
      : null;
    const upiAcct = selectedUpiId
      ? allAccounts.find((a) => a.id === selectedUpiId)
      : null;
    if (!bankAcct && !upiAcct) return localBs;
    return {
      ...localBs,
      ...(bankAcct
        ? {
            bankName: bankAcct.bankName ?? localBs.bankName,
            bankAccountName:
              bankAcct.accountHolderName ?? localBs.bankAccountName,
            bankAccountNumber:
              bankAcct.accountNumber ?? localBs.bankAccountNumber,
            bankIfsc: bankAcct.ifsc ?? localBs.bankIfsc,
            bankSwift:
              (bankAcct as { swift?: string | null }).swift ??
              localBs.bankSwift,
          }
        : {}),
      ...(upiAcct
        ? {
            upiId: upiAcct.upiId ?? localBs.upiId,
          }
        : {}),
    };
  })();

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

  const clientEmail = (doc as { client?: { email?: string | null } | null })
    ?.client?.email;

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
          {/* Left: back + breadcrumb + badges */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/proforma-invoices")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/sales-and-invoices/proforma-invoices")}
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
            {isPaid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-3" />
                Paid
              </span>
            )}
          </div>
        </div>

        {/* 3-step indicator */}
        {isProforma && (
          <div className="mx-auto mt-3 flex max-w-[1400px] items-center gap-3 text-sm">
            {/* Step 1 — done */}
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                <Check className="size-3" />
              </span>
              <span className="text-sm font-medium text-zinc-500 underline underline-offset-2">
                Add {typeLabel} Details
              </span>
            </div>
            <ChevronRight className="size-4 text-zinc-300" />
            {/* Step 2 — clickable */}
            <button
              type="button"
              onClick={() =>
                router.push(`/sales-and-invoices/proforma-invoices/${id}/bank-details`)
              }
              className="flex flex-col items-start group"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full border-2 border-zinc-300 text-xs font-semibold text-zinc-400 group-hover:border-[#7438dc] group-hover:text-[#7438dc]">
                  2
                </span>
                <span className="text-sm font-medium text-zinc-500 underline underline-offset-2 group-hover:text-[#7438dc]">
                  Add Bank &amp; UPI Details
                </span>
              </div>
              <span className="ml-7 text-xs text-zinc-400">Optional</span>
            </button>
            <ChevronRight className="size-4 text-zinc-300" />
            {/* Step 3 — active */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
                  3
                </span>
                <span className="text-sm font-semibold text-zinc-900">
                  Customise &amp; Share
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action toolbar */}
        <div className="mx-auto mt-3 flex max-w-[1400px] flex-wrap items-center gap-2">
          {/* Edit */}
          <button
            type="button"
            onClick={() =>
              router.push(`/sales-and-invoices/proforma-invoices/${id}/edit`)
            }
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="size-4" />
            <span>Edit</span>
          </button>

          {/* Payment buttons — only for invoices */}
          {isProforma && (
            <>
              <button
                type="button"
                onClick={handleRecordPaymentClick}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <CreditCard className="size-4" />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                onClick={() => toast.info("Will Pay Later — coming soon")}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Clock className="size-4" />
                <span>Will Pay Later</span>
              </button>
            </>
          )}

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
                businessSettings={effectiveBs}
                settings={localSettings}
                documentLabel={typeLabel}
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
              documentLabel={typeLabel}
            />
          </div>
        </div>
      </div>

      {/* Email sheet */}
      <EmailProformaDocumentSheet
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        document={adapted}
        documentId={id}
        clientEmail={clientEmail}
        documentLabel={typeLabel}
      />

      {/* Record Payment modal */}
      {isProforma && (
        <RecordPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          documentId={id}
          payment={pendingPayment}
          invoice={invoiceSummary}
          onApproved={() => {
            qc.invalidateQueries({ queryKey: ["proforma-invoices"] });
            qc.invalidateQueries({ queryKey: ["proforma-payments", id] });
            qc.invalidateQueries({ queryKey: ["payment-receipts"] });
          }}
        />
      )}
    </div>
  );
}
