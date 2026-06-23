"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronDown, Info, Loader2, Plus, Trash2 } from "lucide-react";

import { AddPaymentAccountModal } from "@/app/(protected)/sales-and-invoices/documents/components/add-payment-account-modal";
import type { PaymentAccount } from "@/lib/hooks/use-payment-accounts";
import {
  useCreateVendorLead,
  useUpdateVendorLead,
  type VendorLeadRow,
} from "@/lib/hooks/use-vendor-leads";
import {
  vendorLeadCreateSchema,
  type VendorLeadCreateInput,
} from "@/lib/validations/vendor-lead";

const COUNTRIES = ["India", "UAE", "USA", "UK", "Singapore"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Kerala",
  "Maharashtra", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh",
];
const PHONE_CODES = ["+91", "+971", "+1", "+44"];

type Props = {
  initialData?: VendorLeadRow | null;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
};

const inputCls =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20";
const selectCls = `${inputCls} appearance-none`;

export function VendorLeadForm({ initialData, onCancel, onSaved }: Props) {
  const isEdit = Boolean(initialData?.id);
  const createMutation = useCreateVendorLead();
  const updateMutation = useUpdateVendorLead();

  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>(
    Array.isArray(initialData?.customFields)
      ? (initialData!.customFields as { label: string; value: string }[])
      : [],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorLeadCreateInput>({
    resolver: zodResolver(vendorLeadCreateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      phoneCode: initialData?.phoneCode ?? "+91",
      phone: initialData?.phone ?? "",
      vendorType: initialData?.vendorType ?? "INDIVIDUAL",
      subject: initialData?.subject ?? "",
      notes: initialData?.notes ?? "",
      country: initialData?.country ?? "India",
      state: initialData?.state ?? "",
      city: initialData?.city ?? "",
      postalCode: initialData?.postalCode ?? "",
      streetAddress: initialData?.streetAddress ?? "",
      gstNumber: initialData?.gstNumber ?? "",
      gstStateCode: initialData?.gstStateCode ?? "",
      panNumber: initialData?.panNumber ?? "",
      nameAsPerPan: initialData?.nameAsPerPan ?? "",
      paymentAccountId: initialData?.paymentAccountId ?? "",
    },
  });

  const vendorType = watch("vendorType");
  const country = watch("country");

  const onSubmit = async (data: VendorLeadCreateInput) => {
    const payload = {
      ...data,
      customFields: customFields.filter((f) => f.label.trim() || f.value.trim()),
      paymentAccountId: paymentAccount?.id ?? data.paymentAccountId ?? undefined,
    };

    if (isEdit && initialData) {
      const result = await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      onSaved?.(result.vendorLead.id);
    } else {
      const result = await createMutation.mutateAsync(payload);
      onSaved?.(result.vendorLead.id);
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-8">
        {/* Lead Details */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-zinc-900">Lead Details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" required error={errors.name?.message}>
              <input {...register("name")} placeholder="Full name of the vendor" className={inputCls} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <div className="flex gap-2">
                <select {...register("phoneCode")} className={`${selectCls} w-24 shrink-0`}>
                  {PHONE_CODES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input {...register("phone")} placeholder="Phone number" className={inputCls} />
              </div>
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" {...register("email")} className={inputCls} />
            </Field>
            <Field label="Country" required error={errors.country?.message}>
              <div className="relative">
                <select {...register("country")} className={selectCls}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </Field>
            <Field label="State" error={errors.state?.message}>
              <div className="relative">
                <select {...register("state")} className={selectCls}>
                  <option value="">Select…</option>
                  {(country === "India" ? INDIAN_STATES : []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </Field>
            <Field label="GSTIN" error={errors.gstNumber?.message}>
              <input {...register("gstNumber")} placeholder="Business GSTIN" className={inputCls} />
            </Field>
            <Field label="PAN Number" error={errors.panNumber?.message}>
              <input {...register("panNumber")} placeholder="PAN Number" className={inputCls} />
            </Field>
            <Field label="Name as Per PAN" error={errors.nameAsPerPan?.message}>
              <input {...register("nameAsPerPan")} placeholder="Name as Per PAN" className={inputCls} />
            </Field>
            <Field label="Vendor Type" required>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    value="INDIVIDUAL"
                    checked={vendorType === "INDIVIDUAL"}
                    onChange={() => setValue("vendorType", "INDIVIDUAL")}
                    className="accent-[#7438dc]"
                  />
                  Individual
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    value="COMPANY"
                    checked={vendorType === "COMPANY"}
                    onChange={() => setValue("vendorType", "COMPANY")}
                    className="accent-[#7438dc]"
                  />
                  Company
                  <Info className="size-3.5 text-zinc-400" />
                </label>
              </div>
            </Field>
            <Field label="City" error={errors.city?.message}>
              <input {...register("city")} placeholder="City" className={inputCls} />
            </Field>
            <Field label="Pincode" error={errors.postalCode?.message}>
              <input {...register("postalCode")} placeholder="Pincode" className={inputCls} />
            </Field>
            <Field label="Street" error={errors.streetAddress?.message} className="sm:col-span-2">
              <input {...register("streetAddress")} placeholder="Street" className={inputCls} />
            </Field>
            <Field label="Subject" error={errors.subject?.message} className="sm:col-span-2">
              <input {...register("subject")} placeholder="E.g. Mobile App Development" className={inputCls} />
              <p className="mt-1 text-xs text-zinc-500">
                Brief 4-5 words on what they&apos;re looking for
              </p>
            </Field>
          </div>
        </section>

        {/* Bank Account */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Bank Account Details <span className="text-sm font-normal text-zinc-400">(Optional)</span>
          </h2>
          {paymentAccount || initialData?.paymentAccount ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-3">
                <Building2 className="size-8 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-900">
                    {(paymentAccount ?? initialData?.paymentAccount)?.displayName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {(paymentAccount ?? initialData?.paymentAccount)?.bankName}{" "}
                    • ****
                    {String((paymentAccount ?? initialData?.paymentAccount)?.accountNumber ?? "").slice(-4)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentAccount(null);
                  setValue("paymentAccountId", "");
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center">
              <Building2 className="mx-auto size-10 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-700">Add Bank Account Details</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
                Record all payments received against this and future invoices in the respective Bank and other Payment Accounts.
              </p>
              <button
                type="button"
                onClick={() => setBankModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
              >
                <Plus className="size-4" />
                Add Bank Account
              </button>
            </div>
          )}
        </section>

        {/* Custom fields */}
        <section>
          <button
            type="button"
            onClick={() => setCustomFields((prev) => [...prev, { label: "", value: "" }])}
            className="text-sm font-medium text-[#7438dc] hover:underline"
          >
            + Add Custom Fields
          </button>
          {customFields.length > 0 && (
            <div className="mt-3 space-y-2">
              {customFields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={f.label}
                    onChange={(e) => {
                      const next = [...customFields];
                      next[i] = { ...next[i], label: e.target.value };
                      setCustomFields(next);
                    }}
                    placeholder="Label"
                    className={inputCls}
                  />
                  <input
                    value={f.value}
                    onChange={(e) => {
                      const next = [...customFields];
                      next[i] = { ...next[i], value: e.target.value };
                      setCustomFields(next);
                    }}
                    placeholder="Value"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomFields((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-md border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3 pb-8">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-zinc-200 px-5 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-[#7438dc] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Vendor Lead"}
          </button>
        </div>
      </form>

      <AddPaymentAccountModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onAdded={(account) => {
          setPaymentAccount(account);
          setValue("paymentAccountId", account.id);
          setBankModalOpen(false);
        }}
      />
    </>
  );
}

function Field({
  label,
  children,
  error,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
