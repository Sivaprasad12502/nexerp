"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  type PaymentAccount,
  type PaymentAccountCustomField,
} from "@/lib/hooks/use-payment-accounts";

const PRESET_FIELDS = ["Level", "Employee Id", "Phone Number"] as const;

type EmployeeFormState = {
  country: string;
  accountHolderName: string;
  department: string;
  currency: string;
  ledgerName: string;
  customFields: PaymentAccountCustomField[];
};

const EMPTY: EmployeeFormState = {
  country: "India",
  accountHolderName: "",
  department: "",
  currency: "INR",
  ledgerName: "",
  customFields: [],
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]";
const errorInputCls =
  "w-full rounded-md border border-red-400 px-3 py-2 text-sm focus:border-red-500 focus:outline-none";
const labelCls = "mb-1 block text-sm font-medium text-zinc-700";
const errorCls = "mt-0.5 text-xs text-red-500";

export function AddEmployeeAccountModal({
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
  const [form, setForm] = useState<EmployeeFormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormState, string>>>({});

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
        accountHolderName: initialData.accountHolderName ?? "",
        department: initialData.department ?? "",
        currency: initialData.currency ?? "INR",
        ledgerName: initialData.ledgerName ?? "",
        customFields: cf,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [open, initialData]);

  const set = <K extends keyof EmployeeFormState>(k: K, v: EmployeeFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof EmployeeFormState, string>> = {};
    if (!form.accountHolderName.trim()) e.accountHolderName = "Employee name is required";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.currency.trim()) e.currency = "Currency is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      type: "EMPLOYEE" as const,
      country: form.country,
      currency: form.currency,
      accountHolderName: form.accountHolderName,
      department: form.department || null,
      ledgerName: form.ledgerName || null,
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

  const addPresetField = (label: string) => {
    if (form.customFields.some((f) => f.label === label)) return;
    setForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { label, value: "" }],
    }));
  };

  const updateCustomField = (idx: number, key: keyof PaymentAccountCustomField, value: string) =>
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
            {isEdit ? "Edit Employee Account" : "Add New Employee Account"}
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
                <option value="UAE">UAE</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Employee Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.accountHolderName}
                onChange={(e) => set("accountHolderName", e.target.value)}
                className={errors.accountHolderName ? errorInputCls : inputCls}
              />
              {errors.accountHolderName && <p className={errorCls}>{errors.accountHolderName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency<span className="text-red-500">*</span></label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
                <option value="INR">Indian Rupee (INR, ₹)</option>
                <option value="USD">US Dollar (USD, $)</option>
                <option value="AED">UAE Dirham (AED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Ledger</label>
            <input
              type="text"
              placeholder="Search existing Ledgers"
              value={form.ledgerName}
              onChange={(e) => set("ledgerName", e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-zinc-500">Leave blank to create a new ledger</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {PRESET_FIELDS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => addPresetField(label)}
                className="flex items-center gap-1 text-sm font-medium text-[#7438dc] hover:underline"
              >
                <Plus className="size-3.5" /> Add {label}
              </button>
            ))}
          </div>

          {form.customFields.map((field, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={field.label}
                readOnly
                className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                className={inputCls}
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}
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
