"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  PlusCircle,
  Printer,
  Receipt,
  Share2,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { redirectToAuth } from "@/lib/public-auth-flow";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type PublicPayment = {
  id: string;
  amountReceived: number;
  paymentDate: string;
  method: string;
  status: string;
};

type ApiResponse = {
  document: QuotationRow;
  businessSettings: BusinessSettingsRow | null;
  clientEmail: string | null;
  approvalToken: string;
  payments: PublicPayment[];
  acceptanceStatus: string | null;
  isDebitNoteAccepted: boolean;
  paymentStatus: string;
  isPaid: boolean;
  linkedInvoiceId: string | null;
  linkedInvoiceNumber: string | null;
  linkedInvoiceApprovalToken: string | null;
  expenditureAdded: boolean;
  expenditureDocumentId: string | null;
};

type PaymentFormData = {
  amountReceived: string;
  paymentDate: string;
  method: string;
  recordedByName: string;
  refId: string;
};

type DebitNoteModalStep = "none" | "accept" | "reject";
type ExpenditureModalStep = "none" | "add" | "reject";

export default function ReceivedDebitNotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [debitNoteModalStep, setDebitNoteModalStep] =
    useState<DebitNoteModalStep>("none");
  const [expenditureModalStep, setExpenditureModalStep] =
    useState<ExpenditureModalStep>("none");
  const [localExpenditureId, setLocalExpenditureId] = useState<string | null>(
    null,
  );
  const [localExpenditureDeclined, setLocalExpenditureDeclined] =
    useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amountReceived: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "ACCOUNT_TRANSFER",
    recordedByName: "",
    refId: "",
  });

  const refetch = () =>
    fetch(`/api/debit-notes/received/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 401) {
          redirectToAuth(router, {
            callbackPath: `/purchases/debit-note/received/${token}`,
            email: body.clientEmail,
          });
          throw new Error("Authentication required");
        }
        if (!r.ok) throw new Error(body.error ?? "Failed to load debit note");
        return body as ApiResponse;
      })
      .then(setData);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated") {
      redirectToAuth(router, {
        callbackPath: `/purchases/debit-note/received/${token}`,
      });
      return;
    }

    refetch()
      .catch((e: Error) => {
        if (e.message !== "Authentication required") setFetchError(e.message);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sessionStatus, router]);

  const debitNoteRespondMutation = useMutation({
    mutationFn: (action: "accept" | "reject") =>
      fetch(`/api/debit-notes/received/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to respond");
        return body;
      }),
    onSuccess: (_, action) => {
      setDebitNoteModalStep("none");
      toast.success(
        action === "accept"
          ? "Debit note accepted."
          : "Debit note rejected.",
      );
      refetch().catch(() => null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addExpenditureMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/debit-notes/received/${token}/add-expenditure`, {
        method: "POST",
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(body.error ?? "Failed to add as expenditure");
        return body as {
          document: { id: string };
          created: boolean;
          vendorCreated?: boolean;
        };
      }),
    onSuccess: (result) => {
      setLocalExpenditureId(result.document.id);
      setLocalExpenditureDeclined(false);
      setExpenditureModalStep("none");
      const sellerName = data?.document.fromName?.trim();
      if (result.vendorCreated && sellerName) {
        toast.success(
          result.created
            ? `Debit note added to your expenditures. ${sellerName} was added to your vendors.`
            : `Already added to your expenditures. ${sellerName} was added to your vendors.`,
        );
      } else {
        toast.success(
          result.created
            ? "Debit note added to your expenditures."
            : "Already added to your expenditures.",
        );
      }
      refetch().catch(() => null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectExpenditureMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/debit-notes/received/${token}/reject-expenditure`, {
        method: "POST",
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(body.error ?? "Failed to remove expenditure");
        return body;
      }),
    onSuccess: () => {
      setLocalExpenditureId(null);
      setLocalExpenditureDeclined(true);
      setExpenditureModalStep("none");
      toast.success("Expenditure rejected. The sender has been notified.");
      refetch().catch(() => null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        await navigator.share({ title: "Debit Note", url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading debit note…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Debit Note Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const {
    document: doc,
    businessSettings,
    payments,
    acceptanceStatus,
    isDebitNoteAccepted,
    isPaid,
    linkedInvoiceId,
    linkedInvoiceNumber,
    expenditureAdded: serverExpenditureAdded,
    expenditureDocumentId: serverExpenditureDocumentId,
  } = data;

  const isRejected = acceptanceStatus === "REJECTED";
  const showDebitNoteButtons = !acceptanceStatus;

  const expenditureAdded =
    !localExpenditureDeclined &&
    (serverExpenditureAdded || Boolean(localExpenditureId));
  const expenditureDocumentId =
    localExpenditureId ?? serverExpenditureDocumentId;
  const showExpenditureButtons = !expenditureAdded && !localExpenditureDeclined;

  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const approvedPayments = payments.filter((p) => p.status === "APPROVED");
  const totalPaid = approvedPayments.reduce((s, p) => s + p.amountReceived, 0);

  const settings: QuotationSettings = {
    ...DEFAULT_QUOTATION_SETTINGS,
    ...(doc.settings as Partial<QuotationSettings>),
  };
  const bs: BusinessSettingsRow = businessSettings ?? {};

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-24">
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

          <div className="flex flex-wrap items-center gap-2">
            {/* {showDebitNoteButtons && (
              <>
                <button
                  type="button"
                  onClick={() => setDebitNoteModalStep("accept")}
                  disabled={debitNoteRespondMutation.isPending}
                  className="flex h-9 items-center gap-2 rounded-md bg-[#7438dc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
                >
                  <ThumbsUp className="size-4" />
                  Accept expenditure
                </button>
                <button
                  type="button"
                  onClick={() => setDebitNoteModalStep("reject")}
                  disabled={debitNoteRespondMutation.isPending}
                  className="flex h-9 items-center gap-2 rounded-md bg-[#e8145a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
                >
                  <ThumbsDown className="size-4" />
                  Reject Expenditure
                </button>
              </>
            )} */}

            {expenditureAdded ? (
              <a
                href={`/purchases/expenditure/${expenditureDocumentId}`}
                className="flex h-9 items-center gap-2 rounded-md border border-[#7438dc] px-4 text-sm font-semibold text-[#7438dc] transition-colors hover:bg-purple-50"
              >
                <Receipt className="size-4" />
                View via Expenditure
              </a>
            ) : showExpenditureButtons ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpenditureModalStep("add")}
                  disabled={addExpenditureMutation.isPending}
                  className="flex h-9 items-center gap-2 rounded-md bg-[#7438dc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
                >
                  <PlusCircle className="size-4" />
                  {addExpenditureMutation.isPending ? "Adding…" : "Accept Expenditure"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenditureModalStep("reject")}
                  disabled={rejectExpenditureMutation.isPending}
                  className="flex h-9 items-center gap-2 rounded-md bg-[#e8145a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
                >
                  <ThumbsDown className="size-4" />
                  {rejectExpenditureMutation.isPending ? "Rejecting…" : "Reject Expenditure"}
                </button>
              </>
            ) : null}

            {!isPaid && (
              <button
                type="button"
                onClick={() => setShowPaymentForm(true)}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <CreditCard className="size-4" />
                Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              Debit Note #{doc.quotationNumber}
            </p>
            <p className="text-xs text-zinc-400">
              {doc.fromName ? `From ${doc.fromName}` : ""}
              {linkedInvoiceNumber
                ? ` · Linked to Invoice #${linkedInvoiceNumber}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDebitNoteAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3.5" />
                Accepted
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                <XCircle className="size-3.5" />
                Rejected
              </span>
            )}
            {isPaid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3.5" />
                Paid
              </span>
            )}
            {!isPaid && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                Unpaid
              </span>
            )}
            {expenditureAdded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200">
                <Receipt className="size-3.5" />
                Added to Expenditure
              </span>
            )}
          </div>
        </div>

        {pendingPayments.length > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Payment Pending Approval</p>
              <p className="mt-0.5 text-sm text-amber-600">
                {doc.currency}{" "}
                {pendingPayments
                  .reduce((s, p) => s + p.amountReceived, 0)
                  .toFixed(2)}{" "}
                is awaiting approval from the business.
              </p>
            </div>
          </div>
        )}

        {!isPaid && totalPaid > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Partially Paid</p>
              <p className="mt-0.5 text-sm text-blue-600">
                {doc.currency} {totalPaid.toFixed(2)} received. Balance:{" "}
                {doc.currency}{" "}
                {Math.max(0, doc.totalAmount - totalPaid).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <QuotationPreview
            quotation={doc}
            settings={settings}
            businessSettings={bs}
            documentLabel="Debit Note"
          />
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-3">
          {/* {showDebitNoteButtons && (
            <>
              <button
                type="button"
                onClick={() => setDebitNoteModalStep("accept")}
                disabled={debitNoteRespondMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <ThumbsUp className="size-4" />
                Accept Expenditure
              </button>
              <button
                type="button"
                onClick={() => setDebitNoteModalStep("reject")}
                disabled={debitNoteRespondMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
              >
                <ThumbsDown className="size-4" />
                Reject Expendture
              </button>
            </>
          )} */}

          {expenditureAdded ? (
            <a
              href={`/purchases/expenditure/${expenditureDocumentId}`}
              className="flex h-10 items-center gap-2 rounded-md border border-[#7438dc] px-5 text-sm font-semibold text-[#7438dc] transition-colors hover:bg-purple-50"
            >
              <Receipt className="size-4" />
              View via Expenditure
            </a>
          ) : showExpenditureButtons ? (
            <>
              <button
                type="button"
                onClick={() => setExpenditureModalStep("add")}
                disabled={addExpenditureMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6230c4] disabled:opacity-60"
              >
                <PlusCircle className="size-4" />
                {addExpenditureMutation.isPending ? "Adding…" : "Accept Expenditure"}
              </button>
              <button
                type="button"
                onClick={() => setExpenditureModalStep("reject")}
                disabled={rejectExpenditureMutation.isPending}
                className="flex h-10 items-center gap-2 rounded-md bg-[#e8145a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c91050] disabled:opacity-60"
              >
                <ThumbsDown className="size-4" />
                {rejectExpenditureMutation.isPending ? "Rejecting…" : "Reject Expenditure"}
              </button>
            </>
          ) : null}

          {!isPaid && (
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <CreditCard className="size-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Accept debit note modal */}
      <Modal
        open={debitNoteModalStep === "accept"}
        onClose={() => setDebitNoteModalStep("none")}
        title="Accept Debit Note"
        description="Confirm that you accept this debit note."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDebitNoteModalStep("none")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
              disabled={debitNoteRespondMutation.isPending}
              onClick={() => debitNoteRespondMutation.mutate("accept")}
            >
              {debitNoteRespondMutation.isPending ? "Accepting…" : "Accept Debit Note"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to accept debit note #{doc.quotationNumber}?
          The sender will be notified.
        </p>
      </Modal>

      {/* Reject debit note modal */}
      <Modal
        open={debitNoteModalStep === "reject"}
        onClose={() => setDebitNoteModalStep("none")}
        title="Reject Debit Note"
        description="Confirm that you want to reject this debit note."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDebitNoteModalStep("none")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#e8145a] text-white hover:bg-[#c91050]"
              disabled={debitNoteRespondMutation.isPending}
              onClick={() => debitNoteRespondMutation.mutate("reject")}
            >
              {debitNoteRespondMutation.isPending ? "Rejecting…" : "Reject Debit Note"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to reject debit note #{doc.quotationNumber}?
          The sender will be notified.
        </p>
      </Modal>

      {/* Accept expenditure modal */}
      <Modal
        open={expenditureModalStep === "add"}
        onClose={() => setExpenditureModalStep("none")}
        title="Accept Expenditure"
        description="Add this debit note to your expenditures."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenditureModalStep("none")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
              disabled={addExpenditureMutation.isPending}
              onClick={() => addExpenditureMutation.mutate()}
            >
              {addExpenditureMutation.isPending ? "Adding…" : "Accept Expenditure"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          This will add debit note #{doc.quotationNumber} to your expenditures
          as a purchase record.
        </p>
      </Modal>

      {/* Reject expenditure modal */}
      <Modal
        open={expenditureModalStep === "reject"}
        onClose={() => setExpenditureModalStep("none")}
        title="Reject Expenditure"
        description="Decline adding this debit note to your expenditures."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenditureModalStep("none")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#e8145a] text-white hover:bg-[#c91050]"
              disabled={rejectExpenditureMutation.isPending}
              onClick={() => rejectExpenditureMutation.mutate()}
            >
              {rejectExpenditureMutation.isPending
                ? "Rejecting…"
                : "Reject Expenditure"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          {expenditureAdded
            ? "This will remove the linked expenditure from your books and notify the debit note sender by email."
            : "This will notify the debit note sender that you have declined to record this as an expenditure."}
        </p>
      </Modal>

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
                  Amount ({doc.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={doc.totalAmount.toFixed(2)}
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
                  Reference ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="Transaction / cheque number"
                  value={paymentForm.refId}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, refId: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  paymentMutation.isPending || !paymentForm.amountReceived
                }
                onClick={() => paymentMutation.mutate()}
                className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
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
