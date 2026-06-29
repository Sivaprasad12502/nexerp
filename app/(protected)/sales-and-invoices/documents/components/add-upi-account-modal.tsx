"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  usePaymentAccounts,
  useCreatePaymentAccount,
  type PaymentAccount,
} from "@/lib/hooks/use-payment-accounts";

export function AddUpiAccountModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (account: PaymentAccount) => void;
}) {
  const [vpa, setVpa] = useState("");
  const [linkedBankId, setLinkedBankId] = useState("");
  const [vpaError, setVpaError] = useState("");

  const { data: accountsData } = usePaymentAccounts();
  const bankAccounts = (accountsData?.accounts ?? []).filter(
    (a) => a.type === "BANK",
  );

  const createMutation = useCreatePaymentAccount();

  useEffect(() => {
    if (!open) {
      setVpa("");
      setLinkedBankId("");
      setVpaError("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!vpa.trim()) {
      setVpaError("VPA (UPI ID) is required");
      return;
    }
    setVpaError("");

    createMutation.mutate(
      {
        type: "BANK",
        upiId: vpa.trim(),
        linkedBankAccountId: linkedBankId || null,
        displayName: vpa.trim(),
      },
      {
        onSuccess: ({ account }) => {
          onAdded(account);
          onClose();
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">
            Add New Payment Account
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            {/* VPA */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                VPA (UPI ID)<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="example@upi"
                value={vpa}
                onChange={(e) => {
                  setVpa(e.target.value);
                  if (vpaError) setVpaError("");
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  vpaError
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-zinc-300 focus:border-[#7438dc] focus:ring-[#7438dc]"
                }`}
              />
              {vpaError && (
                <p className="mt-0.5 text-xs text-red-500">{vpaError}</p>
              )}
            </div>

            {/* Link Bank Account */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Link Bank Account
              </label>
              <div className="relative">
                <select
                  value={linkedBankId}
                  onChange={(e) => setLinkedBankId(e.target.value)}
                  className="w-full appearance-none rounded-md border border-zinc-300 px-3 py-2 pr-8 text-sm text-zinc-700 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                >
                  <option value="">Search Bank Accounts</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Upgrade notice */}
          <p className="mt-4 text-xs text-zinc-500">
            <span className="mr-1">🏅</span>
            Upgrade to Accounts to link Payment Account to a Ledger.{" "}
            <button type="button" className="font-medium text-[#7438dc] hover:underline">
              Upgrade Now &gt;
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="rounded-md bg-[#7438dc] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {createMutation.isPending ? "Adding…" : "Add Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
