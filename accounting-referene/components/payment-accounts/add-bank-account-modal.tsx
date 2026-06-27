"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  type PaymentAccount,
  type PaymentAccountCustomField,
} from "@/lib/hooks/use-payment-accounts";

type BankFormState = {
  country: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  branch: string;
  accountHolderName: string;
  accountType: "SAVINGS" | "CURRENT" | "";
  currency: string;
  swift: string;
  customFields: PaymentAccountCustomField[];
};

const EMPTY_FORM: BankFormState = {
  country: "India",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  branch: "",
  accountHolderName: "",
  accountType: "",
  currency: "INR",
  swift: "",
  customFields: [],
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]";
const errorInputCls =
  "w-full rounded-md border border-red-400 px-3 py-2 text-sm text-zinc-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-400";
const labelCls = "mb-1 block text-sm font-medium text-zinc-700";
const errorCls = "mt-0.5 text-xs text-red-500";

export function AddBankAccountModal({
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
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [showSwift, setShowSwift] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BankFormState, string>>>({});

  const createMutation = useCreatePaymentAccount();
  const updateMutation = useUpdatePaymentAccount();

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const cf = Array.isArray(initialData.customFields)
        ? (initialData.customFields as PaymentAccountCustomField[])
        : [];
      setForm({
        country: initialData.country ?? "India",
        bankName: initialData.bankName ?? "",
        accountNumber: initialData.accountNumber ?? "",
        confirmAccountNumber: initialData.accountNumber ?? "",
        ifsc: initialData.ifsc ?? "",
        branch: initialData.branch ?? "",
        accountHolderName: initialData.accountHolderName ?? "",
        accountType: (initialData.accountType as "SAVINGS" | "CURRENT" | "") ?? "",
        currency: initialData.currency ?? "INR",
        swift: initialData.swift ?? "",
        customFields: cf,
      });
      setShowSwift(!!initialData.swift);
    } else {
      setForm(EMPTY_FORM);
      setShowSwift(false);
    }
    setErrors({});
  }, [open, initialData]);

  const set = <K extends keyof BankFormState>(k: K, v: BankFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof BankFormState, string>> = {};
    if (!form.bankName.trim()) e.bankName = "Bank Name is required";
    if (!form.accountNumber.trim()) e.accountNumber = "Account Number is required";
    if (form.accountNumber !== form.confirmAccountNumber)
      e.confirmAccountNumber = "Account numbers do not match";
    if (!form.ifsc.trim()) e.ifsc = "IFSC Code is required";
    if (!form.accountHolderName.trim()) e.accountHolderName = "Account Holder Name is required";
    if (!form.accountType) e.accountType = "Please select an account type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      type: "BANK" as const,
      country: form.country || null,
      bankName: form.bankName || null,
      accountNumber: form.accountNumber || null,
      ifsc: form.ifsc || null,
      branch: form.branch || null,
      accountHolderName: form.accountHolderName || null,
      accountType: (form.accountType as "SAVINGS" | "CURRENT") || null,
      currency: form.currency || null,
      swift: form.swift || null,
      customFields: form.customFields.length > 0 ? form.customFields : null,
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

  const addCustomField = () =>
    setForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { label: "", value: "" }],
    }));

  const removeCustomField = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== idx),
    }));

  const updateCustomField = (
    idx: number,
    key: keyof PaymentAccountCustomField,
    value: string,
  ) =>
    setForm((prev) => {
      const updated = [...prev.customFields];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, customFields: updated };
    });

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {isEdit ? "Edit Bank Account" : "Add New Bank Account"}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Country<span className="text-red-500">*</span></label>
              <select value={form.country} onChange={(e) => set("country", e.target.value)} className={inputCls}>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="UAE">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Bank Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                className={errors.bankName ? errorInputCls : inputCls}
              />
              {errors.bankName && <p className={errorCls}>{errors.bankName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Account Number<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                className={errors.accountNumber ? errorInputCls : inputCls}
              />
              {errors.accountNumber && <p className={errorCls}>{errors.accountNumber}</p>}
            </div>
            <div>
              <label className={labelCls}>Confirm Account Number<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.confirmAccountNumber}
                onChange={(e) => set("confirmAccountNumber", e.target.value)}
                className={errors.confirmAccountNumber ? errorInputCls : inputCls}
              />
              {errors.confirmAccountNumber && <p className={errorCls}>{errors.confirmAccountNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>IFSC Code<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.ifsc}
                onChange={(e) => set("ifsc", e.target.value)}
                className={errors.ifsc ? errorInputCls : inputCls}
              />
              {errors.ifsc && <p className={errorCls}>{errors.ifsc}</p>}
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input
                type="text"
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Account Holder Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.accountHolderName}
                onChange={(e) => set("accountHolderName", e.target.value)}
                className={errors.accountHolderName ? errorInputCls : inputCls}
              />
              {errors.accountHolderName && <p className={errorCls}>{errors.accountHolderName}</p>}
            </div>
            <div>
              <label className={labelCls}>Bank Account Type<span className="text-red-500">*</span></label>
              <select
                value={form.accountType}
                onChange={(e) => set("accountType", e.target.value as "SAVINGS" | "CURRENT" | "")}
                className={errors.accountType ? errorInputCls : inputCls}
              >
                <option value="">Select type</option>
                <option value="CURRENT">Current</option>
                <option value="SAVINGS">Savings</option>
              </select>
              {errors.accountType && <p className={errorCls}>{errors.accountType}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Currency<span className="text-red-500">*</span></label>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
              <option value="INR">Indian Rupee (INR, ₹)</option>
              <option value="USD">US Dollar (USD, $)</option>
              <option value="EUR">Euro (EUR, €)</option>
              <option value="GBP">British Pound (GBP, £)</option>
              <option value="AED">UAE Dirham (AED)</option>
            </select>
          </div>

          {!showSwift ? (
            <button
              type="button"
              onClick={() => setShowSwift(true)}
              className="flex items-center gap-1 text-sm font-medium text-[#7438dc] hover:underline"
            >
              <Plus className="size-3.5" /> Add SWIFT Code
            </button>
          ) : (
            <div>
              <label className={labelCls}>SWIFT Code</label>
              <input type="text" value={form.swift} onChange={(e) => set("swift", e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">Custom Bank Details</p>
            {form.customFields.map((field, idx) => (
              <div key={idx} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => updateCustomField(idx, "label", e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
                <button type="button" onClick={() => removeCustomField(idx)} className="text-zinc-400 hover:text-red-500">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomField}
              className="w-full rounded-md border border-dashed border-[#7438dc] py-2 text-sm font-medium text-[#7438dc] hover:bg-purple-50"
            >
              + Add Custom Field
            </button>
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
