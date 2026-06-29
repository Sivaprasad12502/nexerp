"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  type PaymentAccount,
} from "@/lib/hooks/use-payment-accounts";

type OtherFormState = {
  displayName: string;
  country: string;
  currency: string;
  description: string;
};

const EMPTY: OtherFormState = {
  displayName: "",
  country: "India",
  currency: "INR",
  description: "",
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]";
const labelCls = "mb-1 block text-sm font-medium text-zinc-700";
const errorCls = "mt-0.5 text-xs text-red-500";

export function AddOtherAccountModal({
  open,
  onClose,
  onAdded,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (account: PaymentAccount) => void;
  initialData?: PaymentAccount | null;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<OtherFormState>(EMPTY);
  const [nameError, setNameError] = useState("");

  const createMutation = useCreatePaymentAccount();
  const updateMutation = useUpdatePaymentAccount();

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const desc =
        Array.isArray(initialData.customFields) && initialData.customFields[0]
          ? String(initialData.customFields[0].value ?? "")
          : "";
      setForm({
        displayName: initialData.displayName,
        country: initialData.country ?? "India",
        currency: initialData.currency ?? "INR",
        description: desc,
      });
    } else {
      setForm(EMPTY);
    }
    setNameError("");
  }, [open, initialData]);

  const handleSubmit = () => {
    if (!form.displayName.trim()) {
      setNameError("Account name is required");
      return;
    }

    const payload = {
      type: "OTHER" as const,
      displayName: form.displayName.trim(),
      country: form.country,
      currency: form.currency,
      customFields: form.description
        ? [{ label: "Description", value: form.description }]
        : null,
    };

    if (isEdit && initialData) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        { onSuccess: ({ account }) => { onAdded(account); onClose(); } },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: ({ account }) => { onAdded(account); onClose(); },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {isEdit ? "Edit Other Account" : "Add Other Account"}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Account Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Petty Cash, Company Wallet"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              className={nameError ? "border-red-400 " + inputCls : inputCls}
            />
            {nameError && <p className={errorCls}>{nameError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                className={inputCls}
              >
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UAE">UAE</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className={inputCls}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className={inputCls}
              placeholder="Cash, card, UPI wallet, etc."
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <button type="button" onClick={onClose} className="text-sm text-zinc-600 hover:text-zinc-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-[#7438dc] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
