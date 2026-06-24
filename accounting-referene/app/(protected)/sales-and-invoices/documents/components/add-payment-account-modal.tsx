"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, User, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  type PaymentAccount,
  type PaymentAccountCustomField,
} from "@/lib/hooks/use-payment-accounts";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountTypeChoice = "BANK" | "EMPLOYEE" | "OTHER";
type ModalStep = "type" | "form";

type BankFormState = {
  country: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
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
  accountHolderName: "",
  accountType: "",
  currency: "INR",
  swift: "",
  customFields: [],
};

// Re-export so callers get the fully typed PaymentAccount from the hook
export type { PaymentAccount };

// ─── Component ────────────────────────────────────────────────────────────────

export function AddPaymentAccountModal({
  open,
  onClose,
  onAdded,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (account: PaymentAccount) => void;
  /** When provided the modal operates in edit mode (PATCH) */
  initialData?: PaymentAccount | null;
}) {
  const isEdit = !!initialData;

  const [step, setStep] = useState<ModalStep>("type");
  const [accountTypeChoice, setAccountTypeChoice] = useState<AccountTypeChoice>("BANK");
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [showSwift, setShowSwift] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BankFormState, string>>>({});

  const createMutation = useCreatePaymentAccount();
  const updateMutation = useUpdatePaymentAccount();

  // Seed form from initialData when editing
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setStep("form");
      const cf = Array.isArray(initialData.customFields)
        ? (initialData.customFields as PaymentAccountCustomField[])
        : [];
      setForm({
        country: initialData.country ?? "India",
        bankName: initialData.bankName ?? "",
        accountNumber: initialData.accountNumber ?? "",
        confirmAccountNumber: initialData.accountNumber ?? "",
        ifsc: initialData.ifsc ?? "",
        accountHolderName: initialData.accountHolderName ?? "",
        accountType: (initialData.accountType as "SAVINGS" | "CURRENT" | "") ?? "",
        currency: initialData.currency ?? "INR",
        swift: initialData.swift ?? "",
        customFields: cf,
      });
      setShowSwift(!!initialData.swift);
    } else {
      setStep("type");
      setAccountTypeChoice("BANK");
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
      accountHolderName: form.accountHolderName || null,
      accountType: (form.accountType as "SAVINGS" | "CURRENT") || null,
      currency: form.currency || null,
      swift: form.swift || null,
      customFields: form.customFields.length > 0 ? form.customFields : null,
    };

    if (isEdit && initialData) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: ({ account }) => {
            onAdded(account);
            handleClose();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: ({ account }) => {
          onAdded(account);
          handleClose();
        },
      });
    }
  };

  const handleClose = () => {
    setStep("type");
    setAccountTypeChoice("BANK");
    setForm(EMPTY_FORM);
    setShowSwift(false);
    setErrors({});
    onClose();
  };

  const handleTypeContinue = () => {
    if (accountTypeChoice === "BANK") {
      setStep("form");
      return;
    }
    toast.info("Coming soon");
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

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]";
  const errorInputCls =
    "w-full rounded-md border border-red-400 px-3 py-2 text-sm text-zinc-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-400";
  const labelCls = "mb-1 block text-sm font-medium text-zinc-700";
  const errorCls = "mt-0.5 text-xs text-red-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {isEdit
              ? "Edit Bank Account"
              : step === "type"
                ? "Add New Payment Account"
                : "Add New Bank Account"}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {step === "type" && !isEdit ? (
          <>
            <div className="px-6 py-6">
              <p className="mb-5 text-center text-sm text-zinc-600">
                Which account would you like to add?
              </p>
              <div className="space-y-3">
                <TypeCard
                  selected={accountTypeChoice === "BANK"}
                  onSelect={() => setAccountTypeChoice("BANK")}
                  icon={Building2}
                  title="Bank Account"
                  description="All types of bank accounts"
                />
                <TypeCard
                  selected={accountTypeChoice === "EMPLOYEE"}
                  onSelect={() => setAccountTypeChoice("EMPLOYEE")}
                  icon={User}
                  title="Employee Account"
                  description="Add your employees to manage and track salaries & reimbursements."
                />
                <TypeCard
                  selected={accountTypeChoice === "OTHER"}
                  onSelect={() => setAccountTypeChoice("OTHER")}
                  icon={Wallet}
                  title="Other Account"
                  description="Cash, Debit/Credit cards, UPI, Wallets and more"
                />
              </div>
              <div className="mt-5 rounded-lg bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                Add Accounts to easily manage and track your withdrawals, deposits, salaries,
                reimbursements and more{" "}
                <button type="button" className="text-[#7438dc] hover:underline">
                  Learn More
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTypeContinue}
                className="rounded-md bg-[#7438dc] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {!isEdit && (
            <button
              type="button"
              onClick={() => setStep("type")}
              className="text-sm text-[#7438dc] hover:underline"
            >
              ← Back to account type
            </button>
          )}
          {/* Row 1: Country + Bank Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Country<span className="text-red-500">*</span>
              </label>
              <select
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
              >
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="UAE">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
                <option value="Germany">Germany</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Bank Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Demo National Bank"
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                className={errors.bankName ? errorInputCls : inputCls}
              />
              {errors.bankName && <p className={errorCls}>{errors.bankName}</p>}
            </div>
          </div>

          {/* Row 2: Account Number + Confirm Account Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Account Number<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder=""
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                className={errors.accountNumber ? errorInputCls : inputCls}
              />
              {errors.accountNumber && <p className={errorCls}>{errors.accountNumber}</p>}
            </div>
            <div>
              <label className={labelCls}>
                Confirm Account Number<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder=""
                value={form.confirmAccountNumber}
                onChange={(e) => set("confirmAccountNumber", e.target.value)}
                className={errors.confirmAccountNumber ? errorInputCls : inputCls}
              />
              {errors.confirmAccountNumber && (
                <p className={errorCls}>{errors.confirmAccountNumber}</p>
              )}
            </div>
          </div>

          {/* Row 3: IFSC + Account Holder Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                IFSC Code<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder=""
                value={form.ifsc}
                onChange={(e) => set("ifsc", e.target.value)}
                className={errors.ifsc ? errorInputCls : inputCls}
              />
              {errors.ifsc && <p className={errorCls}>{errors.ifsc}</p>}
            </div>
            <div>
              <label className={labelCls}>
                Account Holder Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder=""
                value={form.accountHolderName}
                onChange={(e) => set("accountHolderName", e.target.value)}
                className={errors.accountHolderName ? errorInputCls : inputCls}
              />
              {errors.accountHolderName && (
                <p className={errorCls}>{errors.accountHolderName}</p>
              )}
            </div>
          </div>

          {/* Row 4: Bank Account Type + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Bank Account Type<span className="text-red-500">*</span>
              </label>
              <select
                value={form.accountType}
                onChange={(e) =>
                  set("accountType", e.target.value as "SAVINGS" | "CURRENT" | "")
                }
                className={errors.accountType ? errorInputCls : inputCls}
              >
                <option value="">Select type</option>
                <option value="CURRENT">Current</option>
                <option value="SAVINGS">Savings</option>
              </select>
              {errors.accountType && <p className={errorCls}>{errors.accountType}</p>}
            </div>
            <div>
              <label className={labelCls}>
                Currency<span className="text-red-500">*</span>
              </label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={inputCls}
              >
                <option value="INR">Indian Rupee (INR, ₹)</option>
                <option value="USD">US Dollar (USD, $)</option>
                <option value="EUR">Euro (EUR, €)</option>
                <option value="GBP">British Pound (GBP, £)</option>
                <option value="AED">UAE Dirham (AED)</option>
                <option value="SGD">Singapore Dollar (SGD)</option>
                <option value="AUD">Australian Dollar (AUD)</option>
                <option value="CAD">Canadian Dollar (CAD)</option>
              </select>
            </div>
          </div>

          {/* Add SWIFT Code toggle */}
          {!showSwift ? (
            <button
              type="button"
              onClick={() => setShowSwift(true)}
              className="flex items-center gap-1 text-sm font-medium text-[#7438dc] hover:underline"
            >
              <Plus className="size-3.5" />
              Add SWIFT Code
            </button>
          ) : (
            <div>
              <label className={labelCls}>SWIFT Code</label>
              <input
                type="text"
                placeholder="e.g. HDFCINBB"
                value={form.swift}
                onChange={(e) => set("swift", e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {/* Custom Bank Details */}
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">Custom Bank Details</p>
            <div className="space-y-2">
              {form.customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={field.label}
                    onChange={(e) => updateCustomField(idx, "label", e.target.value)}
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#7438dc] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="rounded p-1 text-zinc-400 hover:text-red-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCustomField}
              className="mt-2 w-full rounded-md border border-dashed border-[#7438dc] py-2 text-sm font-medium text-[#7438dc] hover:bg-purple-50"
            >
              + Add Custom Field
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
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
          </>
        )}
      </div>
    </div>
  );
}

function TypeCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-[#7438dc] bg-violet-50/40 ring-2 ring-[#7438dc]/20"
          : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-[#7438dc]" : "border-zinc-300"
        }`}
      >
        {selected && <span className="size-2 rounded-full bg-[#7438dc]" />}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className={`size-5 ${selected ? "text-[#7438dc]" : "text-zinc-400"}`} />
          <span className={`font-semibold ${selected ? "text-[#7438dc]" : "text-zinc-800"}`}>
            {title}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
    </button>
  );
}
