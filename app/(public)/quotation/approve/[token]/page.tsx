"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Share2,
  ThumbsUp,
  Link2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { redirectToAuth } from "@/lib/public-auth-flow";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicQuotation = QuotationRow & {
  sentAt: string | null;
  viewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  purchaseOrderCreatedAt: string | null;
  rejectionReason: string | null;
  businessRelationshipId?: string | null;
};

type ApiResponse = {
  quotation: PublicQuotation;
  clientEmail: string | null;
  businessSettings: BusinessSettingsRow | null;
};

type ConvertPoResponse = {
  document: { id: string; documentNumber: string };
  quotation: { id: string; status: string; purchaseOrderCreatedAt: string | null };
  created: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InlineStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SENT: { label: "Sent", className: "bg-blue-50 text-blue-700 ring-blue-200" },
    VIEWED: { label: "Quotation Seen", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    APPROVED: { label: "Accepted", className: "bg-green-50 text-green-700 ring-green-200" },
    REJECTED: { label: "Rejected", className: "bg-red-50 text-red-600 ring-red-200" },
    PURCHASE_ORDER_CREATED: {
      label: "Purchase Order Created",
      className: "bg-purple-50 text-purple-700 ring-purple-200",
    },
  };
  const badge = map[status];
  if (!badge) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  approvedAt,
  rejectedAt,
  rejectionReason,
  hasRelationship,
  purchaseOrderId,
  purchaseOrderNumber,
}: {
  status: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  hasRelationship: boolean;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-green-800">Quotation Accepted</p>
          {approvedAt && (
            <p className="mt-0.5 text-sm text-green-600">Accepted on {fmt(approvedAt)}</p>
          )}
          {hasRelationship && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
              <Link2 className="size-4" />
              Vendor relationship confirmed
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "PURCHASE_ORDER_CREATED") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-purple-600" />
        <div>
          <p className="font-semibold text-purple-800">Purchase Order Created</p>
          {purchaseOrderNumber && (
            <p className="mt-0.5 text-sm text-purple-600">PO #{purchaseOrderNumber}</p>
          )}
          {purchaseOrderId && (
            <a
              href={`/purchases/purchase-order`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
            >
              View purchase orders
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div>
          <p className="font-semibold text-red-800">Quotation Rejected</p>
          {rejectedAt && (
            <p className="mt-0.5 text-sm text-red-600">Rejected on {fmt(rejectedAt)}</p>
          )}
          {rejectionReason && (
            <p className="mt-2 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
              {rejectionReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotationApprovePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string | null>(null);

  const refetch = () =>
    fetch(`/api/public/quotations/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load quotation");
        return body as ApiResponse;
      })
      .then(setData);

  useEffect(() => {
    refetch()
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/public/quotations/${token}/approve`, { method: "POST" }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to accept quotation");
        return body;
      }),
    onSuccess: () => {
      toast.success("Quotation accepted successfully!");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      fetch(`/api/public/quotations/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to reject");
        return body;
      }),
    onSuccess: () => {
      toast.success("Quotation rejected.");
      setShowRejectModal(false);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertPoMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/public/quotations/${token}/convert-po`, { method: "POST" }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to create purchase order");
        return body as ConvertPoResponse;
      }),
    onSuccess: (result) => {
      setPurchaseOrderId(result.document.id);
      setPurchaseOrderNumber(result.document.documentNumber);
      toast.success(
        result.created
          ? "Purchase order created successfully!"
          : "Purchase order already exists.",
      );
      setTimeout(()=>{
        router.push("/purchases/purchase-order")
      }, 800)
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleActionClick = (action: "approve" | "reject" | "convert-po") => {
    if (sessionStatus !== "authenticated") {
      redirectToAuth(router, {
        callbackPath: `/quotation/approve/${token}`,
        email: data?.clientEmail,
      });
      return;
    }
    if (action === "approve") {
      approveMutation.mutate();
    } else if (action === "reject") {
      setShowRejectModal(true);
    } else {
      convertPoMutation.mutate();
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Quotation", url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading quotation…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Quotation Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This quotation link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { quotation, businessSettings } = data;
  const settings: QuotationSettings = {
    ...DEFAULT_QUOTATION_SETTINGS,
    ...(typeof quotation.settings === "object" && quotation.settings !== null
      ? (quotation.settings as Partial<QuotationSettings>)
      : {}),
  };
  const bs: BusinessSettingsRow = businessSettings ?? {};

  const isDecided =
    quotation.status === "APPROVED" ||
    quotation.status === "REJECTED" ||
    (quotation.status as string) === "PURCHASE_ORDER_CREATED";
  const isPending =
    !isDecided && (quotation.status === "VIEWED" || quotation.status === "SENT");
  const canConvertPo = quotation.status === "APPROVED";
  const hasPo = (quotation.status as string) === "PURCHASE_ORDER_CREATED";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12">
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

          <div className="flex items-center gap-3">
            {canConvertPo && (
              <button
                type="button"
                onClick={() => handleActionClick("convert-po")}
                disabled={convertPoMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                {convertPoMutation.isPending ? "Creating…" : "Add As Purchase Order"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        {/* Header with status */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Quotation #{quotation.quotationNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {quotation.clientName ? `For ${quotation.clientName}` : ""}
            </p>
          </div>
          <InlineStatusBadge status={quotation.status} />
        </div>

        <StatusBanner
          status={quotation.status}
          approvedAt={quotation.approvedAt}
          rejectedAt={quotation.rejectedAt}
          rejectionReason={quotation.rejectionReason}
          hasRelationship={!!quotation.businessRelationshipId}
          purchaseOrderId={purchaseOrderId}
          purchaseOrderNumber={purchaseOrderNumber}
        />

        {sessionStatus === "authenticated" &&
          data.clientEmail &&
          session?.user?.email?.toLowerCase() !== data.clientEmail.toLowerCase() && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                You are signed in as <strong>{session.user.email}</strong>. Only{" "}
                <strong>{data.clientEmail}</strong> can accept or reject this quotation.
              </p>
            </div>
          )}

        <div className="overflow-x-auto rounded-xl">
          <QuotationPreview
            quotation={quotation}
            businessSettings={bs}
            settings={settings}
          />
        </div>

        {isPending && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => handleActionClick("approve")}
              disabled={approveMutation.isPending}
              className="flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-md bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle2 className="size-4" />
              {approveMutation.isPending ? "Accepting…" : "Accept Quotation"}
            </button>

            <button
              type="button"
              onClick={() => handleActionClick("reject")}
              disabled={rejectMutation.isPending}
              className="flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-6 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="size-4" />
              Reject Quotation
            </button>
          </div>
        )}

        {hasPo && !purchaseOrderId && (
          <div className="mt-8 flex justify-center">
            <a
              href="/purchases/purchase-order"
              className="inline-flex items-center gap-2 rounded-md border border-purple-300 bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              <ExternalLink className="size-4" />
              View Purchase Orders
            </a>
          </div>
        )}

        {sessionStatus === "unauthenticated" && (isPending || canConvertPo) && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            You will be prompted to sign in or create an account before taking action.
          </p>
        )}
      </div>

      {/* Bottom action bar (mirrors mockup) */}
      {(canConvertPo || hasPo) && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-end">
            {canConvertPo && (
              <button
                type="button"
                onClick={() => handleActionClick("convert-po")}
                disabled={convertPoMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                {convertPoMutation.isPending ? "Creating…" : "Add As Purchase Order"}
              </button>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Quotation"
        description="Please let us know why you are rejecting this quotation."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {rejectMutation.isPending ? "Submitting…" : "Submit Rejection"}
            </button>
          </>
        }
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={4}
          placeholder="Reason for rejection…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
        />
      </Modal>
    </div>
  );
}
