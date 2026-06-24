"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Plus, QrCode } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDocument } from "@/lib/hooks/use-documents";
import { usePaymentAccounts, type PaymentAccount } from "@/lib/hooks/use-payment-accounts";
import { AddPaymentAccountModal } from "../../../documents/components/add-payment-account-modal";
import { AddUpiAccountModal } from "../../../documents/components/add-upi-account-modal";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: docData } = useDocument(id);
  const { data: accountsData, isLoading: accountsLoading } = usePaymentAccounts();

  const doc = docData?.document;
  const docSettings =
    typeof doc?.settings === "object" && doc.settings !== null
      ? (doc.settings as Record<string, unknown>)
      : {};

  const allAccounts = accountsData?.accounts ?? [];
  const bankAccounts = allAccounts.filter((a) => a.type === "BANK" && !a.upiId);
  const upiAccounts = allAccounts.filter(
    (a) => a.upiId && !a.accountNumber,
  );
  // accounts that are "bank" but have upiId — show in both sections
  const bankWithUpi = allAccounts.filter((a) => a.upiId && a.accountNumber);
  const allBankAccounts = [...bankAccounts, ...bankWithUpi];
  const allUpiAccounts = [...upiAccounts, ...bankWithUpi];

  // ── Selections (seeded from doc settings) ──
  const [selectedBankId, setSelectedBankId] = useState<string>(
    (docSettings.selectedPaymentAccountId as string) ?? "",
  );
  const [selectedUpiId, setSelectedUpiId] = useState<string>(
    (docSettings.selectedUpiAccountId as string) ?? "",
  );

  // ── Modal state ──
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const typeLabel = doc?.type
    ? doc.type.charAt(0) + doc.type.slice(1).toLowerCase().replace(/_/g, " ")
    : "Document";

  const handleSaveContinue = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...docSettings,
            selectedPaymentAccountId: selectedBankId || null,
            selectedUpiAccountId: selectedUpiId || null,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      qc.invalidateQueries({ queryKey: ["proforma-invoices", id] });
      toast.success("Bank & UPI details saved");
      router.push(`/sales-and-invoices/proforma-invoices/${id}`);
    } catch {
      toast.error("Failed to save payment details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* 3-step stepper */}
          <div className="flex items-center justify-center gap-3 text-sm">
            {/* Step 1 — done */}
            <button
              type="button"
              onClick={() => router.push(`/sales-and-invoices/proforma-invoices/${id}`)}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                <Check className="size-3.5" />
              </span>
              <span className="underline underline-offset-2">Add {typeLabel} Details</span>
            </button>

            <ChevronRight className="size-4 text-zinc-300" />

            {/* Step 2 — active */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
                  2
                </span>
                <span className="font-semibold text-zinc-900">Add Bank &amp; UPI Details</span>
              </div>
              <span className="ml-8 text-xs text-zinc-400">Optional</span>
            </div>

            <ChevronRight className="size-4 text-zinc-300" />

            {/* Step 3 — upcoming */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full border-2 border-zinc-300 text-xs font-semibold text-zinc-400">
                  3
                </span>
                <span className="text-zinc-400">Customise &amp; Share</span>
              </div>
              <span className="ml-8 text-xs text-zinc-400">Optional</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-center text-lg font-semibold text-zinc-800">
          Add Bank &amp; UPI Details
        </h2>

        {/* Bank Accounts */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-800">Bank Accounts</h3>
            <button
              type="button"
              onClick={() => {
                setEditAccount(null);
                setBankModalOpen(true);
              }}
              className="flex items-center gap-1 text-sm font-medium text-[#7438dc] hover:underline"
            >
              <Plus className="size-3.5" />
              Add New
            </button>
          </div>

          {accountsLoading ? (
            <p className="py-4 text-center text-sm text-zinc-400">Loading…</p>
          ) : allBankAccounts.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">
              No bank accounts yet. Click &quot;+ Add New&quot; to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {allBankAccounts.map((acct) => (
                <label
                  key={acct.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                    selectedBankId === acct.id
                      ? "border-[#7438dc] bg-purple-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="bank-account"
                    value={acct.id}
                    checked={selectedBankId === acct.id}
                    onChange={() => setSelectedBankId(acct.id)}
                    className="mt-1 accent-[#7438dc]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-900">
                        {acct.accountHolderName || acct.displayName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditAccount(acct);
                          setBankModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-[#7438dc] hover:underline"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-0.5 text-sm text-zinc-600">
                      {acct.bankName && (
                        <div>
                          <span className="text-zinc-400 w-20 inline-block">Bank:</span>
                          {acct.bankName}
                        </div>
                      )}
                      {acct.accountNumber && (
                        <div>
                          <span className="text-zinc-400 w-20 inline-block">Acc. No:</span>
                          {acct.accountNumber}
                        </div>
                      )}
                      {acct.ifsc && (
                        <div>
                          <span className="text-zinc-400 w-20 inline-block">IFSC:</span>
                          {acct.ifsc}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* UPI Details */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          {allUpiAccounts.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <QrCode className="mb-3 size-10 text-[#7438dc] opacity-60" />
              <p className="mb-1 text-sm font-semibold text-zinc-700">Add UPI Details</p>
              <p className="mb-5 text-center text-xs text-zinc-500">
                Collect payments via UPI apps such as Google Pay, PhonePe, and PayTM.
              </p>
              <button
                type="button"
                onClick={() => setUpiModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
              >
                <Plus className="size-4" />
                Add UPI ID
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-800">UPI Accounts</h3>
                <button
                  type="button"
                  onClick={() => setUpiModalOpen(true)}
                  className="flex items-center gap-1 text-sm font-medium text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3.5" />
                  Add UPI ID
                </button>
              </div>
              <div className="space-y-3">
                {allUpiAccounts.map((acct) => (
                  <label
                    key={acct.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-white p-4 transition-colors ${
                      selectedUpiId === acct.id
                        ? "border-[#7438dc] bg-purple-50"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="upi-account"
                      value={acct.id}
                      checked={selectedUpiId === acct.id}
                      onChange={() => setSelectedUpiId(acct.id)}
                      className="mt-1 accent-[#7438dc]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {acct.upiId}
                      </p>
                      {acct.accountHolderName && (
                        <p className="text-xs text-zinc-500">{acct.accountHolderName}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/sales-and-invoices/proforma-invoices/${id}`)}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
          >
            ‹ Go back
          </button>
          <button
            type="button"
            onClick={handleSaveContinue}
            disabled={saving}
            className="rounded-md bg-[#7438dc] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & Continue"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddPaymentAccountModal
        open={bankModalOpen}
        onClose={() => {
          setBankModalOpen(false);
          setEditAccount(null);
        }}
        initialData={editAccount}
        onAdded={(acct) => {
          setBankModalOpen(false);
          setEditAccount(null);
          setSelectedBankId(acct.id);
        }}
      />

      <AddUpiAccountModal
        open={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        onAdded={(acct) => {
          setUpiModalOpen(false);
          setSelectedUpiId(acct.id);
        }}
      />
    </div>
  );
}
