"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Clock, Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { PaymentReceiptPreview } from "../../components/payment-receipt-preview";
import { SettledInvoicesTable } from "../../components/settled-invoices-table";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { adaptPaymentReceiptForPreview } from "@/lib/payment-receipt-preview-adapter";
import type { PaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import type { QuotationSettings } from "@/lib/validations/quotation";

type ApiResponse = {
  paymentReceipt: PaymentReceiptRow;
  businessSettings: BusinessSettingsRow | null;
  clientEmail: string | null;
};

export default function ReceivedPaymentReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payment-receipts/received/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load payment receipt");
        return body as ApiResponse;
      })
      .then(setData)
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Payment Receipt", url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading payment receipt…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Payment Receipt Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { paymentReceipt: receipt, businessSettings } = data;
  const previewData = adaptPaymentReceiptForPreview(receipt);
  const settings: QuotationSettings = {
    ...DEFAULT_QUOTATION_SETTINGS,
    ...(receipt.settings as Partial<QuotationSettings>),
  };
  const bs: BusinessSettingsRow = businessSettings ?? {};

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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-24">
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
          size: ${pageSizeMap[settings.pageSize] ?? "A4"};
          margin: ${marginMap[settings.margin] ?? "20mm"};
        }
      `}</style>

      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <Printer className="size-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <Download className="size-4" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <Share2 className="size-4" />
            Share
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PaymentReceiptPreview
          receipt={previewData}
          settings={settings}
          businessSettings={bs}
          numberFormat={receipt.numberFormat}
          decimalDigits={receipt.decimalDigits}
          customCurrencySymbol={receipt.customCurrencySymbol}
        >
          {receipt.allocations.length > 0 && (
            <SettledInvoicesTable
              receipt={receipt}
              themeColor={settings.themeColor || "#7438dc"}
            />
          )}
        </PaymentReceiptPreview>
      </div>
    </div>
  );
}
