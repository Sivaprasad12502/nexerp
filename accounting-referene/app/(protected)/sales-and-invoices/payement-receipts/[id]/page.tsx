"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LinkIcon,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Printer,
} from "lucide-react";

import { usePaymentReceipt } from "@/lib/hooks/use-payment-receipts";
import { adaptPaymentReceiptForPreview } from "@/lib/payment-receipt-preview-adapter";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import type { QuotationSettings } from "@/lib/validations/quotation";
import {
  QuotationSettingsPanel,
} from "../../quotation-estimates/components/quotation-settings-panel";
import type { BusinessSettingsRow } from "../../quotation-estimates/components/quotation-preview";
import { PaymentReceiptPreview } from "../components/payment-receipt-preview";
import { EmailPaymentReceiptSheet } from "../components/email-payment-receipt-sheet";
import { ActionMenu } from "../../clients-prospects/components/action-menu";
import { METHOD_LABELS } from "@/components/shared/payment-form-fields";

function ActionToolbar({
  onEdit,
  onPrint,
  onEmail,
}: {
  onEdit: () => void;
  onPrint: () => void;
  onEmail: () => void;
}) {
  const shareActions = [
    {
      label: "Send Email",
      icon: <Mail className="size-4" />,
      onClick: onEmail,
    },
    {
      label: "Send WhatsApp",
      icon: <MessageCircle className="size-4 text-green-500" />,
      onClick: () => toast.info("WhatsApp sharing coming soon"),
    },
    {
      label: "Copy Link",
      icon: <LinkIcon className="size-4" />,
      onClick: () => toast.info("Copy link coming soon"),
    },
  ];

  const moreActions = [
    { label: "Print / Download PDF", onClick: onPrint },
    { label: "Send Via Email", onClick: onEmail },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Pencil className="size-4" />
        <span>Edit</span>
      </button>

      <div className="mx-1 h-8 w-px bg-zinc-200" />

      <button
        type="button"
        onClick={onPrint}
        className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Printer className="size-4" />
        <span>Print</span>
      </button>

      <button
        type="button"
        onClick={onPrint}
        className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Printer className="size-4" />
        <span>Download</span>
      </button>

      <ActionMenu
        trigger={
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg border border-[#7438dc] px-3 py-2 text-xs text-[#7438dc] transition-colors hover:bg-violet-50"
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
            className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <MoreHorizontal className="size-4" />
            <span>More</span>
          </button>
        }
        items={moreActions}
      />
    </div>
  );
}

export default function PaymentReceiptViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const { data, isLoading, isError } = usePaymentReceipt(id);

  const { data: bsData, isLoading: bsLoading } = useQuery<{
    settings: BusinessSettingsRow;
  }>({
    queryKey: ["business-settings"],
    queryFn: () => fetch("/api/business-settings").then((r) => r.json()),
  });

  const [localSettings, setLocalSettings] = useState<QuotationSettings>(
    DEFAULT_QUOTATION_SETTINGS,
  );
  const [localBs, setLocalBs] = useState<BusinessSettingsRow>({});
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);

  const emailAutoOpen = useRef(false);
  useEffect(() => {
    if (emailAutoOpen.current) return;
    if (searchParams.get("email") === "1") {
      emailAutoOpen.current = true;
      setEmailSheetOpen(true);
    }
  }, [searchParams]);

  const settingsSeeded = useRef(false);
  useEffect(() => {
    if (!settingsSeeded.current && data?.paymentReceipt?.settings) {
      setLocalSettings({
        ...DEFAULT_QUOTATION_SETTINGS,
        ...(data.paymentReceipt.settings as Partial<QuotationSettings>),
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
      fetch(`/api/payment-receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-receipts", id] }),
  });

  const handleSettingsChange = useCallback(
    (patch: Partial<QuotationSettings>) => {
      setLocalSettings((prev) => {
        const next = { ...prev, ...patch };
        if (persistSettingsTimer.current) clearTimeout(persistSettingsTimer.current);
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

  if (isError || !data?.paymentReceipt) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-zinc-500">
        <p>Payment receipt not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/payement-receipts")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Payment Receipts
        </button>
      </div>
    );
  }

  const receipt = data.paymentReceipt;
  const previewData = adaptPaymentReceiptForPreview(receipt);
  const paymentRecords = receipt.lines.map((line) => ({
    method: line.method,
    methodLabel: METHOD_LABELS[line.method] ?? line.method.replace(/_/g, " "),
    amountReceived: line.amountReceived,
    paymentAccountName: line.paymentAccountName,
    currency: receipt.currency,
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
  }));

  const handlePrint = () => window.print();
  const handleEdit = () =>
    router.push(`/sales-and-invoices/payement-receipts/${id}/edit`);

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
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/payement-receipts")}
              className="flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-700"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/sales-and-invoices/payement-receipts")}
              >
                Payment Receipts
              </span>
              <ChevronRight className="size-3.5" />
              <span className="font-medium text-zinc-900">{receipt.receiptNumber}</span>
            </nav>
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-and-invoices/payement-receipts/new")}
            className="rounded-md bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d0187d]"
          >
            + Create New Payment Receipt
          </button>
        </div>

        <div className="mx-auto mt-4 flex max-w-[1400px] items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#7438dc] text-white">
              <Check className="size-3" />
            </span>
            <span className="text-sm text-zinc-600">Add Payment Receipt Details</span>
          </div>
          <div className="h-px flex-1 bg-zinc-200" />
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              2
            </span>
            <span className="text-sm font-semibold text-zinc-900">Customise &amp; Share</span>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-[1400px]">
          <ActionToolbar
            onEdit={handleEdit}
            onPrint={handlePrint}
            onEmail={() => setEmailSheetOpen(true)}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* <div className="mb-4">
          <ActionToolbar
            onEdit={handleEdit}
            onPrint={handlePrint}
            onEmail={() => setEmailSheetOpen(true)}
          />
        </div> */}

        <div className="flex items-start gap-6">
          <div className="flex-1 overflow-auto">
            <PaymentReceiptPreview
              receipt={previewData}
              settings={localSettings}
              businessSettings={localBs}
              numberFormat={receipt.numberFormat}
              decimalDigits={receipt.decimalDigits}
              customCurrencySymbol={receipt.customCurrencySymbol}
            />
          </div>

          <div className="sticky top-[200px] w-[340px] shrink-0">
            <QuotationSettingsPanel
              settings={localSettings}
              onSettingsChange={handleSettingsChange}
              businessSettings={localBs}
              onBusinessSettingsChange={handleBsChange}
              documentLabel="Payment Receipt"
              variant="paymentReceipt"
              paymentRecords={paymentRecords}
            />
          </div>
        </div>

        <div className="mt-4">
          <ActionToolbar
            onEdit={handleEdit}
            onPrint={handlePrint}
            onEmail={() => setEmailSheetOpen(true)}
          />
        </div>
      </div>

      <EmailPaymentReceiptSheet
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        receipt={receipt}
      />
    </div>
  );
}
