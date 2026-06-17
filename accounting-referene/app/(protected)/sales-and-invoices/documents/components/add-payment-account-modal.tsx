"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, Users, Wallet, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType = "BANK" | "EMPLOYEE" | "OTHER";

export type PaymentAccount = {
  id: string;
  type: string;
  displayName: string;
  accountHolderName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  accountType: string | null;
  upiId: string | null;
};

type BankFormState = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: "SAVINGS" | "CURRENT" | "";
  upiId: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AddPaymentAccountModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (account: PaymentAccount) => void;
}) {
  const [step, setStep] = useState<"choose" | "bank-form">("choose");
  const [selected, setSelected] = useState<AccountType>("BANK");
  const [form, setForm] = useState<BankFormState>({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "",
    upiId: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BANK",
          accountHolderName: form.accountHolderName || null,
          bankName: form.bankName || null,
          accountNumber: form.accountNumber || null,
          ifsc: form.ifsc || null,
          branch: form.branch || null,
          accountType: form.accountType || null,
          upiId: form.upiId || null,
        }),
      }).then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to add account");
        return body as { account: PaymentAccount };
      }),
    onSuccess: ({ account }) => {
      toast.success("Payment account added");
      onAdded(account);
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setStep("choose");
    setSelected("BANK");
    setForm({ accountHolderName: "", bankName: "", accountNumber: "", ifsc: "", branch: "", accountType: "", upiId: "" });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {step === "bank-form" && (
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mr-1 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <h3 className="text-base font-semibold text-zinc-900">Add New Payment Account</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step 1 — Choose account type */}
        {step === "choose" && (
          <div className="px-6 py-5">
            <p className="mb-4 text-center text-sm font-medium text-zinc-700">
              Which account would you like to add?
            </p>

            <div className="space-y-3">
              {/* Bank Account */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${selected === "BANK" ? "border-[#7438dc] bg-[#7438dc]/5" : "border-zinc-200 hover:border-zinc-300"}`}>
                <input
                  type="radio"
                  name="acct-type"
                  value="BANK"
                  checked={selected === "BANK"}
                  onChange={() => setSelected("BANK")}
                  className="mt-0.5 accent-[#7438dc]"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <Building2 className="size-4 text-[#7438dc]" />
                    Bank Account
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">All types of bank accounts</p>
                </div>
              </label>

              {/* Employee Account — disabled */}
              <label className="flex cursor-not-allowed items-start gap-3 rounded-lg border-2 border-zinc-200 p-4 opacity-50">
                <input type="radio" name="acct-type" disabled className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <Users className="size-4" />
                    Employee Account
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Coming soon</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">Add your employees to manage and track salaries &amp; reimbursements.</p>
                </div>
              </label>

              {/* Other Account — disabled */}
              <label className="flex cursor-not-allowed items-start gap-3 rounded-lg border-2 border-zinc-200 p-4 opacity-50">
                <input type="radio" name="acct-type" disabled className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <Wallet className="size-4" />
                    Other Account
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Coming soon</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">Cash, Debit/Credit cards, UPI, Wallets and more</p>
                </div>
              </label>
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              Add Accounts to easily manage and track your withdrawals, deposits, salaries, reimbursements and more.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("bank-form")}
                className="rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Bank Account form */}
        {step === "bank-form" && (
          <div className="px-6 py-5">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.accountHolderName}
                  onChange={(e) => setForm((f) => ({ ...f, accountHolderName: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={form.ifsc}
                    onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. MG Road"
                    value={form.branch}
                    onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Account Type</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value as "SAVINGS" | "CURRENT" | "" }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                >
                  <option value="">Select account type</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">UPI ID (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. john@okhdfc"
                  value={form.upiId}
                  onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
              >
                {createMutation.isPending ? "Saving…" : "Save Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
