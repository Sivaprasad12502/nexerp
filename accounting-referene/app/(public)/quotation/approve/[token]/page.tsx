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
} from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import type { QuotationSettings } from "@/lib/validations/quotation";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicQuotation = QuotationRow & {
  sentAt: string | null;
  viewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
};

type ApiResponse = {
  quotation: PublicQuotation;
  clientEmail: string | null;
  businessSettings: BusinessSettingsRow | null;
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

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  approvedAt,
  rejectedAt,
  rejectionReason,
}: {
  status: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-green-800">Quotation Approved</p>
          {approvedAt && (
            <p className="mt-0.5 text-sm text-green-600">Approved on {fmt(approvedAt)}</p>
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

  // ── Fetch quotation ──
  useEffect(() => {
    fetch(`/api/public/quotations/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to load quotation");
        return body as ApiResponse;
      })
      .then(setData)
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Approve mutation ──
  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/public/quotations/${token}/approve`, { method: "POST" }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to approve");
        return body;
      }),
    onSuccess: () => {
      toast.success("Quotation approved successfully!");
      // Refetch to show updated status
      fetch(`/api/public/quotations/${token}`)
        .then((r) => r.json())
        .then(setData);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Reject mutation ──
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
      // Refetch to show updated status
      fetch(`/api/public/quotations/${token}`)
        .then((r) => r.json())
        .then(setData);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleActionClick = (action: "approve" | "reject") => {
    if (sessionStatus !== "authenticated") {
      const callbackUrl = encodeURIComponent(`/quotation/approve/${token}`);
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }
    if (action === "approve") {
      approveMutation.mutate();
    } else {
      setShowRejectModal(true);
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  // ── Loading / error states ──

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

  const isDecided = quotation.status === "APPROVED" || quotation.status === "REJECTED";
  const isPending = !isDecided && (quotation.status === "VIEWED" || quotation.status === "SENT");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Quotation #{quotation.quotationNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {quotation.clientName ? `For ${quotation.clientName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <Printer className="size-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        {/* Status banner */}
        <StatusBanner
          status={quotation.status}
          approvedAt={quotation.approvedAt}
          rejectedAt={quotation.rejectedAt}
          rejectionReason={quotation.rejectionReason}
        />

        {/* Email-match hint for logged-in non-matching user */}
        {sessionStatus === "authenticated" &&
          data.clientEmail &&
          session?.user?.email?.toLowerCase() !== data.clientEmail.toLowerCase() && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                You are signed in as <strong>{session.user.email}</strong>. Only{" "}
                <strong>{data.clientEmail}</strong> can approve or reject this quotation.
              </p>
            </div>
          )}

        {/* Quotation document */}
        <div className="overflow-x-auto rounded-xl">
          <QuotationPreview
            quotation={quotation}
            businessSettings={bs}
            settings={settings}
          />
        </div>

        {/* Action buttons */}
        {isPending && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => handleActionClick("approve")}
              disabled={approveMutation.isPending}
              className="flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-md bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle2 className="size-4" />
              {approveMutation.isPending ? "Approving…" : "Approve Quotation"}
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

        {/* Login nudge for guests */}
        {sessionStatus === "unauthenticated" && isPending && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            You will be prompted to sign in before approving or rejecting.
          </p>
        )}
      </div>

      {/* Reject modal */}
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
