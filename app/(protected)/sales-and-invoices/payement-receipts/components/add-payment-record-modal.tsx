"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Info, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  currencySymbol,
  FormField,
  METHOD_LABELS,
  NumInput,
  tagsFromExtras,
  parseLineTags,
} from "@/components/shared/payment-form-fields";
import {
  AddPaymentAccountModal,
  type PaymentAccount,
} from "@/app/(protected)/sales-and-invoices/documents/components/add-payment-account-modal";
import type { PaymentReceiptLineInput } from "@/lib/validations/payment-receipt";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: PaymentReceiptLineInput | null;
  receiptDate: string;
  currency: string;
  onSave: (line: PaymentReceiptLineInput) => void;
};

function formatReceiptDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AddPaymentRecordModal({
  open,
  onClose,
  initial,
  receiptDate,
  currency,
  onSave,
}: Props) {
  const symbol = currencySymbol(currency);

  const [method, setMethod] = useState<PaymentReceiptLineInput["method"]>("ACCOUNT_TRANSFER");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [tdsPercent, setTdsPercent] = useState("");
  const [tdsWithheld, setTdsWithheld] = useState("0");
  const [transactionCharge, setTransactionCharge] = useState("0");
  const [showRefId, setShowRefId] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [refId, setRefId] = useState("");
  const [notes, setNotes] = useState("");
  const [addAccountOpen, setAddAccountOpen] = useState(false);

  const { data: accountsData, refetch: refetchAccounts } = useQuery<{
    accounts: PaymentAccount[];
  }>({
    queryKey: ["payment-accounts"],
    queryFn: () => fetch("/api/payment-accounts").then((r) => r.json()),
    enabled: open,
  });

  const accounts = accountsData?.accounts ?? [];

  useEffect(() => {
    if (!open) return;
    const parsed = initial ? parseLineTags(initial.tags ?? []) : null;
    setMethod(initial?.method ?? "ACCOUNT_TRANSFER");
    setSelectedAccountId(initial?.paymentAccountId ?? "");
    setAmountReceived(initial ? String(initial.amountReceived) : "");
    setTransactionCharge(String(initial?.transactionCharge ?? 0));
    setTdsWithheld(parsed ? String(parsed.tdsWithheld) : "0");
    setTdsPercent("");
    setRefId(initial?.refId ?? "");
    setNotes(parsed?.notes ?? "");
    setShowRefId(Boolean(initial?.refId));
    setShowNotes(Boolean(parsed?.notes));
  }, [open, initial]);

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

  const handleAmountChange = (val: string) => {
    setAmountReceived(val);
    const pct = parseFloat(tdsPercent);
    const amt = parseFloat(val);
    if (!isNaN(pct) && !isNaN(amt) && pct > 0) {
      setTdsWithheld(((amt * pct) / 100).toFixed(2));
    }
  };

  const handleTdsPercentChange = (val: string) => {
    setTdsPercent(val);
    const pct = parseFloat(val);
    const amt = parseFloat(amountReceived);
    if (!isNaN(pct) && !isNaN(amt)) {
      setTdsWithheld(((amt * pct) / 100).toFixed(2));
    }
  };

  const handleAccountChange = (val: string) => {
    if (val === "__add__") {
      setAddAccountOpen(true);
    } else {
      setSelectedAccountId(val);
    }
  };

  const handleSave = () => {
    const amount = parseFloat(amountReceived);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount received");
      return;
    }
    if (!selectedAccountId) {
      toast.error("Select a payment account");
      return;
    }
    if (!method) {
      toast.error("Select a payment method");
      return;
    }

    const tds = parseFloat(tdsWithheld) || 0;
    const extras = tagsFromExtras(notes, tds);
    const userTags = (initial?.tags ?? []).filter(
      (t) => !t.startsWith("tds:") && !t.startsWith("note:"),
    );

    onSave({
      paymentAccountId: selectedAccountId,
      method,
      refId: refId || null,
      amountReceived: amount,
      amountInBaseCurrency: amount,
      transactionCharge: parseFloat(transactionCharge) || 0,
      tags: [...userTags, ...extras],
      sortOrder: initial?.sortOrder ?? 0,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 py-10">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
                Record Payment Received
              </h3>
              <Info className="size-4 text-zinc-400" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <p className="mb-5 text-sm text-zinc-600">
              Payment Receipt Date:{" "}
              <span className="font-medium text-zinc-900">
                {formatReceiptDate(receiptDate)}
              </span>
            </p>

            <FormField label={<span>Payment Method<span className="text-red-500">*</span></span>}>
              <div className="relative">
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as PaymentReceiptLineInput["method"])
                  }
                  className="w-full appearance-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                >
                  <option value="">Select…</option>
                  {Object.entries(METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-zinc-400" />
              </div>
            </FormField>

            <FormField label={<span>Deposited To<span className="text-red-500">*</span></span>}>
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
                      {acc.bankName ? ` — ${acc.bankName}` : ""}
                    </option>
                  ))}
                  <option value="__add__">＋ Add New Payment Account</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-zinc-400" />
              </div>
            </FormField>

            <FormField
              label={
                <span className="flex items-center gap-1">
                  Payment Ledger
                  <span className="text-amber-500">✦</span>
                  <span className="text-red-500">*</span>
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
              <button
                type="button"
                onClick={() => toast.info("Ledger selection is coming soon")}
                className="mt-1 text-xs text-[#7438dc] hover:underline"
              >
                Change Ledger
              </button>
            </FormField>

            <FormField label={<span>Amount Received (A)<span className="text-red-500">*</span></span>}>
              <NumInput
                symbol={symbol}
                value={amountReceived}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="TDS (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tdsPercent}
                onChange={(e) => handleTdsPercentChange(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                placeholder="0"
              />
            </FormField>

            <FormField label="TDS Withheld (B)">
              <NumInput
                symbol={symbol}
                value={tdsWithheld}
                onChange={setTdsWithheld}
                placeholder="0"
              />
            </FormField>

            <FormField label="Transaction Charge (C)">
              <NumInput
                symbol={symbol}
                value={transactionCharge}
                onChange={setTransactionCharge}
                placeholder="0"
              />
            </FormField>

            <div className="mt-1 flex flex-wrap gap-4">
              {!showRefId && (
                <button
                  type="button"
                  onClick={() => setShowRefId(true)}
                  className="flex items-center gap-1 text-xs text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3" /> Add Reference ID
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
              <FormField label="Additional Notes">
                <textarea
                  rows={2}
                  placeholder="Any additional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </FormField>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
              <Info className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
              This is not an online payment through Refrens. This is a record of payment made by
              the client to you directly.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
            >
              Save &amp; Continue
            </button>
          </div>
        </div>
      </div>

      <AddPaymentAccountModal
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onAdded={async (account) => {
          await refetchAccounts();
          setSelectedAccountId(account.id);
          setAddAccountOpen(false);
        }}
      />
    </>
  );
}
