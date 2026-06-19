"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Share2,
  ThumbsUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";
import { redirectToAuth } from "@/lib/public-auth-flow";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  client: null;
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
  isAccepted: boolean;
  salesOrderId: string | null;
  vendorEmail: string | null;
};

type AcceptResponse = {
  document: { id: string; documentNumber: string };
  created: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicPurchaseOrderPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [salesOrderNumber, setSalesOrderNumber] = useState<string | null>(null);

  const refetch = () =>
    fetch(`/api/public/documents/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load purchase order");
        return body as ApiResponse;
      })
      .then((d) => {
        setData(d);
        if (d.isAccepted && d.salesOrderId) {
          setSalesOrderId(d.salesOrderId);
        }
      });

  useEffect(() => {
    refetch()
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const acceptMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/public/documents/${token}/accept`, { method: "POST" }).then(
        async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error ?? "Failed to accept purchase order");
          return body as AcceptResponse;
        },
      ),
    onSuccess: (result) => {
      setSalesOrderId(result.document.id);
      setSalesOrderNumber(result.document.documentNumber);
      toast.success(
        result.created
          ? `Sales order ${result.document.documentNumber} created!`
          : "Sales order already exists.",
      );
      router.push(`/sales-and-invoices/documents/${result.document.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAccept = () => {
    if (sessionStatus !== "authenticated") {
      redirectToAuth(router, {
        callbackPath: `/purchase-order/${token}?action=accept`,
        email: data?.vendorEmail,
      });
      return;
    }
    acceptMutation.mutate();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Purchase Order", url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  // Auto-accept from email deep link (?action=accept)
  useEffect(() => {
    if (
      searchParams.get("action") === "accept" &&
      sessionStatus === "authenticated" &&
      data &&
      !data.isAccepted &&
      !acceptMutation.isPending &&
      !acceptMutation.isSuccess
    ) {
      acceptMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sessionStatus, data]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading purchase order…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Purchase Order Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { document, isAccepted } = data;
  const effectiveAccepted = isAccepted || Boolean(salesOrderId);

  // Adapt the Document to the QuotationRow shape for QuotationPreview.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotationRow = adaptDocumentToQuotationRow(document as any);

  const bs: BusinessSettingsRow = {};
  const settings = { ...DEFAULT_QUOTATION_SETTINGS };

  const seenAt = document.settings?.seenAt as string | undefined;

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

          {effectiveAccepted && salesOrderId ? (
            <button
              type="button"
              onClick={() => router.push(`/sales-and-invoices/documents/${salesOrderId}`)}
              className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4]"
            >
              <ExternalLink className="size-4" />
              View Sales Order
            </button>
          ) : !effectiveAccepted ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                {acceptMutation.isPending ? "Creating…" : "Accept & Add As Sales Order"}
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                {acceptMutation.isPending ? "Creating…" : "Accept Purchase Order"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Purchase Order #{document.documentNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {document.fromName ? `From ${document.fromName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {seenAt && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Purchase Order Seen
              </span>
            )}
            {effectiveAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200">
                <CheckCircle2 className="size-3.5" />
                Sales Order Created
              </span>
            )}
          </div>
        </div>

        {/* Accepted banner */}
        {effectiveAccepted && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-purple-600" />
            <div>
              <p className="font-semibold text-purple-800">Sales Order Created</p>
              {salesOrderNumber && (
                <p className="mt-0.5 text-sm text-purple-600">
                  Sales Order #{salesOrderNumber}
                </p>
              )}
              <button
                type="button"
                onClick={() =>
                  salesOrderId
                    ? router.push(`/sales-and-invoices/documents/${salesOrderId}`)
                    : router.push("/sales-and-invoices/sales-order")
                }
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
              >
                View Sales Order
                <ExternalLink className="size-3.5" />
              </button>
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

        {!effectiveAccepted && sessionStatus === "unauthenticated" && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            You will be prompted to sign in or create an account before accepting.
          </p>
        )}
      </div>

      {/* Bottom action bar */}
      {(effectiveAccepted && salesOrderId) || !effectiveAccepted ? (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
            {effectiveAccepted && salesOrderId ? (
              <button
                type="button"
                onClick={() => router.push(`/sales-and-invoices/documents/${salesOrderId}`)}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4]"
              >
                <ExternalLink className="size-4" />
                View Sales Order
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
                >
                  <ThumbsUp className="size-4" />
                  {acceptMutation.isPending ? "Creating…" : "Accept & Add As Sales Order"}
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
                >
                  <ThumbsUp className="size-4" />
                  {acceptMutation.isPending ? "Creating…" : "Accept Purchase Order"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
