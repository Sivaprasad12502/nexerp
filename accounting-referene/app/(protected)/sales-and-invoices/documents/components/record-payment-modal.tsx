"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Info, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { AddPaymentAccountModal, type PaymentAccount } from "./add-payment-account-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PendingPayment = {
  id: string;
  status: string;
  amountReceived: number;
  transactionCharge: number;
  tdsWithheld: number;
  amountToSettle: number;
  paymentDate: string;
  method: string;
  refId: string | null;
  notes: string | null;
  recordedByName: string | null;
};

export type InvoiceSummary = {
  documentNumber: string;
  clientName: string | null;
  subTotal: number;
  totalAmount: number;
  currency: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  /** If provided, this is an existing PENDING payment to approve. */
  payment: PendingPayment | null;
  invoice: InvoiceSummary;
  onApproved: () => void;
};

const METHOD_LABELS: Record<string, string> = {
  ACCOUNT_TRANSFER: "Account Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordPaymentModal({
  open,
  onClose,
  documentId,
  payment,
  invoice,
  onApproved,
}: Props) {
  const qc = useQueryClient();

  // Editable form state
  const [amountReceived, setAmountReceived] = useState("");
  const [txCharge, setTxCharge] = useState("0");
  const [tds, setTds] = useState("0");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState("ACCOUNT_TRANSFER");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showRefId, setShowRefId] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [refId, setRefId] = useState("");
  const [notes, setNotes] = useState("");
  const [addAccountOpen, setAddAccountOpen] = useState(false);

  // Seed from pending payment (or defaults) when modal opens
  useEffect(() => {
    if (!open) return;
    if (payment) {
      setAmountReceived(String(payment.amountReceived));
      setTxCharge(String(payment.transactionCharge ?? 0));
      setTds(String(payment.tdsWithheld ?? 0));
      setPaymentDate(
        payment.paymentDate
          ? new Date(payment.paymentDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      );
      setMethod(payment.method ?? "ACCOUNT_TRANSFER");
      setRefId(payment.refId ?? "");
      setNotes(payment.notes ?? "");
    } else {
      setAmountReceived(String(invoice.totalAmount));
      setTxCharge("0");
      setTds("0");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setMethod("ACCOUNT_TRANSFER");
      setRefId("");
      setNotes("");
    }
    setSelectedAccountId("");
    setShowRefId(false);
    setShowNotes(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Payment accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery<{
    accounts: PaymentAccount[];
  }>({
    queryKey: ["payment-accounts"],
    queryFn: () => fetch("/api/payment-accounts").then((r) => r.json()),
    enabled: open,
  });
  const accounts = accountsData?.accounts ?? [];

  // Computed
  const a = parseFloat(amountReceived) || 0;
  const b = parseFloat(txCharge) || 0;
  const c = parseFloat(tds) || 0;
  const amountToSettle = a + b + c;

  const approveMutation = useMutation({
    mutationFn: () => {
      if (payment) {
        // Approve existing pending payment
        return fetch(`/api/payments/${payment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "APPROVED",
            transactionCharge: b,
            tdsWithheld: c,
            paymentAccountId: selectedAccountId || null,
          }),
        }).then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error ?? "Failed to approve payment");
          return body;
        });
      } else {
        // Owner recording new payment directly
        return fetch(`/api/documents/${documentId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountReceived: a,
            paymentDate,
            method,
            refId: refId || null,
            notes: notes || null,
          }),
        }).then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error ?? "Failed to record payment");
          return body;
        });
      }
    },
    onSuccess: () => {
      toast.success(
        payment
          ? "Payment approved. Invoice marked as Paid!"
          : "Payment recorded successfully!",
      );
      qc.invalidateQueries({ queryKey: ["documents", documentId] });
      onApproved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAccountChange = (val: string) => {
    if (val === "__add__") {
      setAddAccountOpen(true);
    } else {
      setSelectedAccountId(val);
    }
  };

  const handleAccountAdded = async (account: PaymentAccount) => {
    await refetchAccounts();
    setSelectedAccountId(account.id);
  };

  // Currency symbol helper
  const symbol = (() => {
    const m = invoice.currency.match(/[₹$€£¥₦₩]/);
    if (m) return m[0];
    const m2 = invoice.currency.match(/\(([^,)]+)/);
    if (m2) return m2[1];
    return invoice.currency.slice(0, 3);
  })();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 py-10">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
              Record Payment
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {/* Invoice summary */}
            <div className="mb-5 space-y-1.5 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
              <SummaryRow label="Invoice No." value={invoice.documentNumber} />
              <SummaryRow label="Billed To" value={invoice.clientName ?? "—"} />
              <SummaryRow
                label="Taxable Amount"
                value={`${symbol} ${invoice.subTotal.toFixed(2)}`}
              />
              <SummaryRow
                label="Invoice Total"
                value={`${symbol} ${invoice.totalAmount.toFixed(2)}`}
                bold
              />
            </div>

            {/* Amount Received */}
            <FormField label="Amount Received (A)">
              <NumInput
                symbol={symbol}
                value={amountReceived}
                onChange={setAmountReceived}
                placeholder={invoice.totalAmount.toFixed(2)}
                readOnly={Boolean(payment)}
              />
            </FormField>

            {/* Transaction Charge */}
            <FormField label="Transaction Charge (B)">
              <NumInput
                symbol={symbol}
                value={txCharge}
                onChange={setTxCharge}
                placeholder="0"
              />
            </FormField>

            {/* TDS withheld */}
            <FormField label="TDS withheld (C)">
              <NumInput
                symbol={symbol}
                value={tds}
                onChange={setTds}
                placeholder="0"
              />
            </FormField>

            {/* Amount to Settle */}
            <FormField label="Amount to Settle (A+B+C)">
              <NumInput
                symbol={symbol}
                value={amountToSettle.toFixed(2)}
                onChange={() => {}}
                readOnly
              />
            </FormField>

            {/* Payment Date */}
            <FormField label="Payment Date">
              <input
                type="date"
                value={paymentDate}
                readOnly={Boolean(payment)}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc] read-only:bg-zinc-50 read-only:text-zinc-500"
              />
            </FormField>

            {/* Payment Method */}
            <FormField label="Payment Method">
              <div className="relative">
                <select
                  value={method}
                  disabled={Boolean(payment)}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full appearance-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc] disabled:bg-zinc-50 disabled:text-zinc-500"
                >
                  {Object.entries(METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-zinc-400" />
              </div>
            </FormField>

            {/* Payment Account */}
            <FormField
              label={
                <span className="flex items-center gap-1">
                  Payment Account
                  <Info className="size-3.5 text-zinc-400" />
                </span>
              }
            >
              <div className="relative">
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full appearance-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                >
                  <option value="">Select Payment Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName}
                    </option>
                  ))}
                  <option value="__add__">＋ Add New Payment Account</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-zinc-400" />
              </div>
            </FormField>

            {/* Ledger — upgrade-gated */}
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-xs text-amber-800">
                Maintaining Ledger accounts is part of Accounts Plan
              </p>
              <button
                type="button"
                className="flex shrink-0 items-center gap-1 rounded-md border border-orange-400 px-2.5 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50"
              >
                <Zap className="size-3 fill-orange-400 text-orange-400" />
                Upgrade
              </button>
            </div>

            <FormField
              label={
                <span className="flex items-center gap-1">
                  Payment Ledger
                  <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                    ★
                  </span>
                </span>
              }
            >
              <div className="relative">
                <select
                  disabled
                  className="w-full appearance-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400"
                >
                  <option>Select Ledger</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-zinc-300" />
              </div>
            </FormField>

            {/* Collapsible extras */}
            <div className="mt-1 flex flex-wrap gap-4">
              {!showRefId && (
                <button
                  type="button"
                  onClick={() => setShowRefId(true)}
                  className="flex items-center gap-1 text-xs text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3" /> Add Ref. ID
                </button>
              )}
              {!showNotes && (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1 text-xs text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3" /> Add Additional Notes
                </button>
              )}
            </div>

            {showRefId && (
              <FormField label="Reference / Transaction ID">
                <input
                  type="text"
                  placeholder="e.g. TXN123456"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </FormField>
            )}

            {showNotes && (
              <FormField label="Notes">
                <textarea
                  rows={2}
                  placeholder="Any additional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </FormField>
            )}

            {/* Pending-payment info note */}
            {payment && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                This is not an online payment through Refrens. This is a record of payment made by the client to you directly.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
            {payment ? (
              <p className="text-xs text-zinc-400">
                Recorded by: {payment.recordedByName ?? "Client"}
              </p>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || !amountReceived}
                className="rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
              >
                {approveMutation.isPending
                  ? "Processing…"
                  : payment
                  ? "Approve"
                  : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add account sub-modal */}
      <AddPaymentAccountModal
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onAdded={handleAccountAdded}
      />
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={bold ? "font-semibold text-zinc-900" : "text-zinc-700"}>
        {value}
      </span>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

function NumInput({
  symbol,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  symbol: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-zinc-300 focus-within:border-[#7438dc] focus-within:ring-1 focus-within:ring-[#7438dc]">
      <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        {symbol}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm text-zinc-900 outline-none read-only:bg-zinc-50 read-only:text-zinc-500"
      />
    </div>
  );
}
