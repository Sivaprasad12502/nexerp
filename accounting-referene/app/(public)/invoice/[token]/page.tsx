"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  AlertCircle,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  CreditCard,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicPayment = {
  id: string;
  amountReceived: number;
  paymentDate: string;
  method: string;
  status: string;
};

type PublicDocument = {
  id: string;
  type: string;
  documentNumber: string;
  documentDate: string;
  fromName: string | null;
  clientName: string | null;
  currency: string;
  subTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalQuantity: number;
  totalAmount: number;
  amountInWords: string | null;
  discountLabel: string | null;
  discountAmount: number;
  additionalCharges: unknown;
  validTillDate: string | null;
  title: string | null;
  subtitle: string | null;
  logo: string | null;
  fromAddress: string | null;
  fromGstin: string | null;
  fromPan: string | null;
  clientId: string | null;
  clientAddress: string | null;
  clientGstin: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  signature: string | null;
  additionalInfo: string | null;
  contactDetails: string | null;
  attachments: string[];
  customFields: unknown;
  settings: Record<string, unknown>;
  status: string;
  createdAt: string;
  items: {
    id: string;
    productId: string | null;
    name: string;
    sku: string | null;
    hsnSac: string | null;
    unit: string | null;
    description: string | null;
    image: string | null;
    groupName: string | null;
    quantity: number;
    rate: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    amount: number;
    total: number;
    sortOrder: number;
  }[];
  business: {
    name: string;
    brandName: string | null;
  };
};

type ApiResponse = {
  document: PublicDocument;
  payments: PublicPayment[];
};

type PaymentFormData = {
  amountReceived: string;
  paymentDate: string;
  method: string;
  recordedByName: string;
  refId: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amountReceived: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "ACCOUNT_TRANSFER",
    recordedByName: "",
    refId: "",
  });

  const refetch = () =>
    fetch(`/api/public/invoices/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load invoice");
        return body as ApiResponse;
      })
      .then(setData);

  useEffect(() => {
    refetch()
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const paymentMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/public/documents/${token}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountReceived: Number(paymentForm.amountReceived),
          paymentDate: paymentForm.paymentDate,
          method: paymentForm.method,
          recordedByName: paymentForm.recordedByName || null,
          refId: paymentForm.refId || null,
        }),
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to record payment");
        return body;
      }),
    onSuccess: () => {
      toast.success("Payment recorded. Awaiting approval from the business.");
      setShowPaymentForm(false);
      refetch().catch(() => null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invoice", url });
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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading invoice…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Invoice Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { document, payments } = data;
  const settings = { ...DEFAULT_QUOTATION_SETTINGS };
  const bs: BusinessSettingsRow = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotationRow = adaptDocumentToQuotationRow(document as any);
  const invoiceSettings = document.settings ?? {};
  const paymentStatus = (invoiceSettings.paymentStatus as string) ?? "UNPAID";
  const isPaid = paymentStatus === "PAID";
  const approvedPayments = payments.filter((p) => p.status === "APPROVED");
  const totalPaid = approvedPayments.reduce((s, p) => s + p.amountReceived, 0);
  const pendingPayments = payments.filter((p) => p.status === "PENDING");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-24">
      {/* Top action bar */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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

          {!isPaid && (
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="flex h-9 items-center gap-2 rounded-md bg-[#7438dc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4]"
            >
              <CreditCard className="size-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Invoice #{document.documentNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {document.fromName ? `From ${document.fromName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPaid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3.5" />
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                Unpaid
              </span>
            )}
          </div>
        </div>

        {/* Pending payment notice */}
        {pendingPayments.length > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Payment Pending Approval</p>
              <p className="mt-0.5 text-sm text-amber-600">
                {document.currency} {pendingPayments.reduce((s, p) => s + p.amountReceived, 0).toFixed(2)} is awaiting approval from the business.
              </p>
            </div>
          </div>
        )}

        {/* Partial payment info */}
        {!isPaid && totalPaid > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Partially Paid</p>
              <p className="mt-0.5 text-sm text-blue-600">
                {document.currency} {totalPaid.toFixed(2)} received. Balance: {document.currency}{" "}
                {Math.max(0, document.totalAmount - totalPaid).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl">
          <QuotationPreview
            quotation={quotationRow}
            businessSettings={bs}
            settings={settings}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      {!isPaid && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4]"
            >
              <CreditCard className="size-4" />
              Record Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment form modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Record Payment</h2>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Amount ({document.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={document.totalAmount.toFixed(2)}
                  value={paymentForm.amountReceived}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amountReceived: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Payment Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, method: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                >
                  <option value="ACCOUNT_TRANSFER">Account Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={paymentForm.recordedByName}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, recordedByName: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Reference / Transaction ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN123456"
                  value={paymentForm.refId}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, refId: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => paymentMutation.mutate()}
                disabled={!paymentForm.amountReceived || paymentMutation.isPending}
                className="flex h-9 items-center gap-2 rounded-md bg-[#7438dc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                {paymentMutation.isPending ? "Submitting…" : "Submit Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
