"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNextDocumentNumber } from "@/lib/hooks/use-sales-orders";
import { redirectToAuth } from "@/lib/public-auth-flow";

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
  client: { email: string | null; businessName: string | null } | null;
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
  purchaseOrderId: string | null;
  clientEmail: string | null;
};

type AcceptModalStep = "none" | "confirm" | "poNumber";

type ConvertResponse = {
  document: { id: string; documentNumber: string };
  created: boolean;
};

export default function PublicSalesOrderPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<AcceptModalStep>("none");
  const [poNumber, setPoNumber] = useState("");
  const [updateBillingAddress, setUpdateBillingAddress] = useState(false);

  const { data: nextNumberData } = useNextDocumentNumber("PURCHASE_ORDER");

  const refetch = () =>
    fetch(`/api/public/sales-orders/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load sales order");
        return body as ApiResponse;
      })
      .then((d) => setData(d));

  useEffect(() => {
    refetch()
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (modalStep === "poNumber" && nextNumberData?.nextNumber && !poNumber) {
      setPoNumber(nextNumberData.nextNumber);
    }
  }, [modalStep, nextNumberData, poNumber]);

  const convertMutation = useMutation({
    mutationFn: (payload: { documentNumber: string; updateBillingAddress: boolean }) =>
      fetch(`/api/public/sales-orders/${token}/convert-po`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to create purchase order");
        return body as ConvertResponse;
      }),
    onSuccess: (result) => {
      setPurchaseOrderNumber(result.document.documentNumber);
      setModalStep("none");
      toast.success(
        result.created
          ? `Purchase order ${result.document.documentNumber} created!`
          : "Purchase order already exists.",
      );
      router.push("/purchases/purchase-order");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startAcceptFlow = () => {
    if (sessionStatus !== "authenticated") {
      redirectToAuth(router, {
        callbackPath: `/sales-order/${token}`,
        email: data?.clientEmail,
      });
      return;
    }
    setModalStep("confirm");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Sales Order", url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleConfirmContinue = () => {
    setPoNumber(nextNumberData?.nextNumber ?? "");
    setModalStep("poNumber");
  };

  const handlePoNumberSubmit = () => {
    const trimmed = poNumber.trim();
    if (!trimmed) {
      toast.error("Please enter a purchase order number");
      return;
    }
    convertMutation.mutate({
      documentNumber: trimmed,
      updateBillingAddress,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading sales order…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Sales Order Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { document, isAccepted } = data;
  const effectiveAccepted = isAccepted || Boolean(purchaseOrderNumber);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotationRow = adaptDocumentToQuotationRow(document as any, "Sales Order");

  const bs: BusinessSettingsRow = {};
  const settings = { ...DEFAULT_QUOTATION_SETTINGS };

  const seenAt = document.settings?.seenAt as string | undefined;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-24">
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

          {!effectiveAccepted && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startAcceptFlow}
                disabled={convertMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                Accept & Add As Purchase Order
              </button>
              <button
                type="button"
                onClick={startAcceptFlow}
                disabled={convertMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                Accept Sales Order
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Sales Order #{document.documentNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {document.fromName ? `From ${document.fromName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {seenAt && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Sales Order Seen
              </span>
            )}
            {effectiveAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200">
                <CheckCircle2 className="size-3.5" />
                Purchase Order Created
              </span>
            )}
          </div>
        </div>

        {effectiveAccepted && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-purple-600" />
            <div>
              <p className="font-semibold text-purple-800">Purchase Order Created</p>
              {purchaseOrderNumber && (
                <p className="mt-0.5 text-sm text-purple-600">
                  Purchase Order #{purchaseOrderNumber}
                </p>
              )}
              <a
                href="/purchases/purchase-order"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
              >
                View Purchase Orders
                <ExternalLink className="size-3.5" />
              </a>
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

      {!effectiveAccepted && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
            <button
              type="button"
              onClick={startAcceptFlow}
              disabled={convertMutation.isPending}
              className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
            >
              <ThumbsUp className="size-4" />
              Accept & Add As Purchase Order
            </button>
            <button
              type="button"
              onClick={startAcceptFlow}
              disabled={convertMutation.isPending}
              className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
            >
              <ThumbsUp className="size-4" />
              Accept Sales Order
            </button>
          </div>
        </div>
      )}

      <Modal
        open={modalStep === "confirm"}
        onClose={() => setModalStep("none")}
        title="Accept Sales Order"
        description="This will create a purchase order in your business from this sales order."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalStep("none")}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
              onClick={handleConfirmContinue}
            >
              Continue
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to accept this sales order and add it as a purchase order?
        </p>
      </Modal>

      <Modal
        open={modalStep === "poNumber"}
        onClose={() => setModalStep("none")}
        title="Update Purchase Order Number"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalStep("none")}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
              disabled={convertMutation.isPending}
              onClick={handlePoNumberSubmit}
            >
              {convertMutation.isPending ? "Updating…" : "Update"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Purchase Order Number
            </label>
            <Input
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="PO-0001"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={updateBillingAddress}
              onChange={(e) => setUpdateBillingAddress(e.target.checked)}
              className="size-4 accent-[#7438dc]"
            />
            <span className="text-sm text-zinc-700">
              Update with your business billing address
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
