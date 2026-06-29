"use client";

import { useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  Link2,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";

import { uploadFile } from "@/lib/upload";
import { clientCreateSchema, type ClientCreateInput } from "@/lib/validations/client";
import { LinkContactSidebar } from "@/components/client/link-contact-sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientRow = {
  id: string;
  logo: string | null;
  businessName: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  clientType: "INDIVIDUAL" | "COMPANY";
  trn: string | null;
  vatNumber: string | null;
  taxTreatment: string | null;
  addressCountry: string | null;
  state: string | null;
  district: string | null;
  addressCity: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  streetAddress: string | null;
  shippingName: string | null;
  shippingCountry: string | null;
  shippingState: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingStreet: string | null;
  businessAlias: string | null;
  uniqueKey: string | null;
  email: string | null;
  showEmailInInvoice: boolean;
  phoneCode: string | null;
  phone: string | null;
  showPhoneInInvoice: boolean;
  defaultDueDays: number | null;
  paymentAccount: string | null;
  status: "ACTIVE" | "ARCHIVED";
  linkedContacts: {
    contact: {
      id: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      image: string | null;
    };
  }[];
};

const INDUSTRIES = [
  "Accounting",
  "Agriculture",
  "Automotive",
  "Construction",
  "Consulting",
  "Education",
  "Finance",
  "Healthcare",
  "Hospitality",
  "Information Technology",
  "Legal",
  "Manufacturing",
  "Media",
  "Real Estate",
  "Retail",
  "Transportation",
  "Wholesale",
  "Other",
];

const COUNTRIES = [
  "United Arab Emirates",
  "India",
  "United States",
  "United Kingdom",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
];

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ClientForm({
  initialData,
  onCancel,
  onSaved,
}: {
  initialData?: ClientRow | null;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const isEdit = !!initialData;
  const qc = useQueryClient();

  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo ?? null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Section toggles
  const [taxOpen, setTaxOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);

  // Linked contacts
  const [linkedIds, setLinkedIds] = useState<string[]>(
    initialData?.linkedContacts.map((lc) => lc.contact.id) ?? [],
  );
  const [linkedContacts, setLinkedContacts] = useState<ClientRow["linkedContacts"][0]["contact"][]>(
    initialData?.linkedContacts.map((lc) => lc.contact) ?? [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ClientCreateInput>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: initialData
      ? {
          logo: initialData.logo ?? "",
          businessName: initialData.businessName,
          industry: initialData.industry ?? "",
          country: initialData.country ?? "",
          city: initialData.city ?? "",
          clientType: initialData.clientType,
          trn: initialData.trn ?? "",
          vatNumber: initialData.vatNumber ?? "",
          taxTreatment: initialData.taxTreatment ?? "",
          addressCountry: initialData.addressCountry ?? "",
          state: initialData.state ?? "",
          district: initialData.district ?? "",
          addressCity: initialData.addressCity ?? "",
          buildingNumber: initialData.buildingNumber ?? "",
          postalCode: initialData.postalCode ?? "",
          streetAddress: initialData.streetAddress ?? "",
          shippingName: initialData.shippingName ?? "",
          shippingCountry: initialData.shippingCountry ?? "",
          shippingState: initialData.shippingState ?? "",
          shippingCity: initialData.shippingCity ?? "",
          shippingPostalCode: initialData.shippingPostalCode ?? "",
          shippingStreet: initialData.shippingStreet ?? "",
          businessAlias: initialData.businessAlias ?? "",
          email: initialData.email ?? "",
          showEmailInInvoice: initialData.showEmailInInvoice,
          phoneCode: initialData.phoneCode ?? "+971",
          phone: initialData.phone ?? "",
          showPhoneInInvoice: initialData.showPhoneInInvoice,
          defaultDueDays: initialData.defaultDueDays ?? undefined,
          paymentAccount: initialData.paymentAccount ?? "",
        }
      : {
          clientType: "COMPANY" as const,
          phoneCode: "+971",
          showEmailInInvoice: false,
          showPhoneInInvoice: false,
        },
  });

  const clientType = watch("clientType");

  const save = useMutation({
    mutationFn: async (data: ClientCreateInput) => {
      const url = isEdit ? `/api/clients/${initialData!.id}` : "/api/clients";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, linkedContactIds: linkedIds }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save client");
      return body;
    },
    onSuccess: (body) => {
      toast.success(isEdit ? "Client updated" : "Client created");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onSaved(body.client.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20 MB");
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("logo", url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  }

  function handleLinkContact(contact: ClientRow["linkedContacts"][0]["contact"]) {
    setLinkedIds((prev) => (prev.includes(contact.id) ? prev : [...prev, contact.id]));
    setLinkedContacts((prev) => (prev.find((c) => c.id === contact.id) ? prev : [...prev, contact]));
  }

  function handleUnlinkContact(contactId: string) {
    setLinkedIds((prev) => prev.filter((id) => id !== contactId));
    setLinkedContacts((prev) => prev.filter((c) => c.id !== contactId));
  }

  function copyBillingToShipping() {
    const v = getValues();
    setValue("shippingCountry", v.addressCountry ?? "");
    setValue("shippingState", v.state ?? "");
    setValue("shippingCity", v.addressCity ?? "");
    setValue("shippingPostalCode", v.postalCode ?? "");
    setValue("shippingStreet", v.streetAddress ?? "");
  }

  return (
    <>
      <form
        className="mx-auto max-w-3xl px-6 py-10"
        onSubmit={handleSubmit((data) => save.mutate(data as ClientCreateInput))}
      >
        {/* ── Upload Logo ───────────────────────────────────── */}
        <SectionHeader>Basic Information</SectionHeader>

        <div className="mt-6">
          <Label>Upload Logo</Label>
          <p className="mt-0.5 text-xs text-zinc-500">
            JPG or PNG, Dimensions 1080×1080px and file size up to 20MB
          </p>
          <div className="mt-3 flex items-center gap-4">
            {logoPreview ? (
              <div className="relative size-16 shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="size-16 rounded-lg object-cover ring-2 ring-zinc-200"
                />
                {logoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                    <Loader2 className="size-5 animate-spin text-[#7438dc]" />
                  </div>
                )}
              </div>
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                <Building2 className="size-8" />
              </span>
            )}
            <button
              type="button"
              disabled={logoUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {logoUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Upload From Computer
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        {/* ── Basic fields ──────────────────────────────────── */}
        <div className="mt-8 grid gap-x-4 gap-y-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label required>Business Name</Label>
            <input
              {...register("businessName")}
              placeholder="Business Name (Required)"
              className={inputCls}
            />
            {errors.businessName && (
              <p className="mt-1 text-xs text-red-500">{errors.businessName.message}</p>
            )}
          </div>

          <div>
            <Label>Client Industry</Label>
            <select {...register("industry")} className={selectCls}>
              <option value="">-Select an Industry-</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div>
            <Label required>Select Country</Label>
            <select {...register("country")} className={selectCls}>
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <ControlledField
            label="City/Town"
            placeholder="City/Town Name"
            register={register("city")}
          />

          {/* Client Type */}
          <div>
            <Label>Client Type</Label>
            <div className="mt-2 flex gap-3">
              {(["INDIVIDUAL", "COMPANY"] as const).map((type) => (
                <label
                  key={type}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    clientType === type
                      ? "border-[#7438dc] bg-[#7438dc]/5 text-[#7438dc]"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    value={type}
                    {...register("clientType")}
                    className="sr-only"
                  />
                  {type === "INDIVIDUAL" ? "Individual" : "Company"}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tax Information ───────────────────────────────── */}
        <SectionTitle
          title="Tax Information"
          optional
          open={taxOpen}
          onToggle={() => setTaxOpen((o) => !o)}
        />
        {taxOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-6 md:grid-cols-2">
            <ControlledField
              label="TRN"
              placeholder="Add TRN (15 Digits)"
              register={register("trn")}
            />
            <ControlledField
              label="VAT Number (TRN)"
              register={register("vatNumber")}
            />
            <ControlledField
              label="Tax Treatment"
              register={register("taxTreatment")}
            />
          </div>
        )}

        {/* ── Address ───────────────────────────────────────── */}
        <SectionTitle
          title="Address"
          optional
          open={addressOpen}
          onToggle={() => setAddressOpen((o) => !o)}
        />
        {addressOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-6 md:grid-cols-2">
            <div>
              <Label>Select Country</Label>
              <select {...register("addressCountry")} className={selectCls}>
                <option value="">Select Country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>State / Province</Label>
              <select {...register("state")} className={selectCls}>
                <option value="">Select State / Province</option>
              </select>
            </div>
            <ControlledField label="District" placeholder="District Name" register={register("district")} />
            <ControlledField label="City/Town" placeholder="City/Town Name" register={register("addressCity")} />
            <ControlledField label="Building Number" placeholder="4 Digit Building Number" register={register("buildingNumber")} />
            <ControlledField label="Postal Code / Zip Code" placeholder="Postal Code / Zip Code" register={register("postalCode")} />
            <div className="md:col-span-2">
              <ControlledField label="Street Address" placeholder="Street Address" register={register("streetAddress")} />
            </div>
          </div>
        )}

        {/* ── Linked Contacts ───────────────────────────────── */}
        <div className="mt-8 border-t border-zinc-100 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-zinc-950">Linked Contacts</h3>
              <span className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                {linkedIds.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Link2 className="size-4" />
              Link Contact
            </button>
          </div>

          {linkedContacts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No contacts linked yet</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {linkedContacts.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                const initials = `${c.firstName[0]}${c.lastName?.[0] ?? ""}`.toUpperCase();
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-2.5"
                  >
                    {c.image ? (
                      <img src={c.image} alt={fullName} className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{fullName}</p>
                      {c.email && <p className="truncate text-xs text-zinc-500">{c.email}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkContact(c.id)}
                      className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label="Unlink contact"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Select Contact to Link
            </button>
          </div>
        </div>

        {/* ── Shipping Details ──────────────────────────────── */}
        <SectionTitle
          title="Shipping Details"
          optional
          open={shippingOpen}
          onToggle={() => setShippingOpen((o) => !o)}
        />
        {shippingOpen && (
          <div className="mt-6">
            <p className="mb-4 text-sm text-zinc-500">
              Add a primary Shipping Detail for this service
            </p>
            <button
              type="button"
              onClick={copyBillingToShipping}
              className="mb-6 inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Copy From Billing Address
            </button>
            <div className="grid gap-x-4 gap-y-6 md:grid-cols-2">
              <ControlledField label="Name" placeholder="Name" register={register("shippingName")} />
              <div>
                <Label>Select Country</Label>
                <select {...register("shippingCountry")} className={selectCls}>
                  <option value="">Select Shipping Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <ControlledField label="State" placeholder="State" register={register("shippingState")} />
              <ControlledField label="City/Town" placeholder="City/Town Name" register={register("shippingCity")} />
              <ControlledField label="Postal Code / Zip Code" placeholder="Postal Code / Zip Code" register={register("shippingPostalCode")} />
              <div className="md:col-span-2">
                <ControlledField label="Street Address" placeholder="Street Address" register={register("shippingStreet")} />
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Details ────────────────────────────── */}
        <SectionTitle
          title="Additional Details"
          optional
          open={additionalOpen}
          onToggle={() => setAdditionalOpen((o) => !o)}
        />
        {additionalOpen && (
          <div className="mt-6 grid gap-x-4 gap-y-6 md:grid-cols-2">
            <ControlledField
              label="Business Alias"
              placeholder="Business Alias"
              register={register("businessAlias")}
            />

            <div>
              <Label>Unique Key</Label>
              <input
                readOnly
                value={initialData?.uniqueKey ?? "Auto-generated on save"}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <Label>Email</Label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Add to directly email documents from Refrens
              </p>
              <input
                {...register("email")}
                type="email"
                placeholder="Email"
                className={`mt-2 ${inputCls}`}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  {...register("showEmailInInvoice")}
                  className="size-4 rounded border-zinc-300 accent-[#7438dc]"
                />
                Show Email in Invoice
              </label>
            </div>

            {/* Phone */}
            <div>
              <Label>Phone No.</Label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Add to directly WhatsApp documents from Refrens
              </p>
              <div className="mt-2 flex">
                <select
                  {...register("phoneCode")}
                  className="h-10 w-24 shrink-0 rounded-l-md border border-r-0 border-zinc-200 bg-white px-2 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                >
                  <option value="+971">+971</option>
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                </select>
                <input
                  {...register("phone")}
                  type="tel"
                  className="h-10 w-full rounded-r-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
                />
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  {...register("showPhoneInInvoice")}
                  className="size-4 rounded border-zinc-300 accent-[#7438dc]"
                />
                Show Phone in Invoice
              </label>
            </div>

            <div>
              <Label>Default Due Date (Days)</Label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Documents for this client/vendor will default to this due date unless manually changed
              </p>
              <input
                {...register("defaultDueDays", { valueAsNumber: true })}
                type="number"
                min={0}
                max={365}
                placeholder="e.g., 30"
                className={`mt-2 ${inputCls}`}
              />
            </div>

            <div>
              <Label>Select Payment Account</Label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Default account displayed on invoices for this client
              </p>
              <select {...register("paymentAccount")} className={`mt-2 ${selectCls}`}>
                <option value="">Select Payment Account</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Account Details ───────────────────────────────── */}
        <SectionTitle
          title="Account Details"
          optional
          open={accountOpen}
          onToggle={() => setAccountOpen((o) => !o)}
        />
        {accountOpen && (
          <p className="mt-4 text-sm text-zinc-500">No account fields configured.</p>
        )}

        {/* ── Attachments ───────────────────────────────────── */}
        <SectionTitle
          title="Attachments"
          optional
          open={attachmentsOpen}
          onToggle={() => setAttachmentsOpen((o) => !o)}
        />
        {attachmentsOpen && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Paperclip className="size-4" />
            Add Attachments
          </button>
        )}

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="mt-10 flex gap-3 border-t border-zinc-100 pt-6">
          <button
            type="submit"
            disabled={save.isPending || logoUploading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2] disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Link Contact Sidebar */}
      <LinkContactSidebar
        open={sidebarOpen}
        linkedIds={linkedIds}
        onLink={handleLinkContact}
        onUnlink={handleUnlinkContact}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]";
const selectCls =
  "mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc]";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-zinc-950">{children}</h2>
  );
}

function SectionTitle({
  title,
  optional = false,
  open,
  onToggle,
}: {
  title: string;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-8 flex w-full items-center justify-between border-t border-zinc-100 pt-6 text-left text-base font-medium text-zinc-950"
    >
      <span className="flex items-center gap-2">
        {title}
        {optional && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-normal text-zinc-500">
            optional
          </span>
        )}
      </span>
      <ChevronDown
        className={`size-5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function ControlledField({
  label,
  required = false,
  placeholder,
  type = "text",
  register,
  error,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  register: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input
        {...register}
        type={type}
        placeholder={placeholder}
        className={inputCls}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Label({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-zinc-950">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}
