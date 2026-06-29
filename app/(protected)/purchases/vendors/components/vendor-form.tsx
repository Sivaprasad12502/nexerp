"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";

import { uploadFile } from "@/lib/upload";
import { vendorCreateSchema, type VendorCreateInput } from "@/lib/validations/vendor";
import { LinkContactSidebar } from "@/components/client/link-contact-sidebar";

// ─── Canonical VendorRow type (used across list, detail, edit) ────────────────

type LinkedContact = {
  id:        string;
  firstName: string;
  lastName:  string | null;
  email:     string | null;
  image:     string | null;
};

export type VendorRow = {
  id:               string;
  businessId:       string;
  linkedBusinessId: string | null;
  name:             string;
  logo:             string | null;
  industry:         string | null;
  country:          string | null;
  city:             string | null;
  vendorType:       "INDIVIDUAL" | "COMPANY";
  email:            string | null;
  phoneCode:        string | null;
  phone:            string | null;
  showEmailInDocs:  boolean;
  showPhoneInDocs:  boolean;
  website:          string | null;
  gstNumber:        string | null;
  trn:              string | null;
  vatNumber:        string | null;
  taxTreatment:     string | null;
  addressCountry:   string | null;
  state:            string | null;
  district:         string | null;
  addressCity:      string | null;
  buildingNumber:   string | null;
  postalCode:       string | null;
  streetAddress:    string | null;
  address:          string | null;
  businessAlias:    string | null;
  defaultDueDays:   number | null;
  paymentAccount:   string | null;
  status:           "ACTIVE" | "ARCHIVED";
  createdAt:        string;
  updatedAt:        string;
  linkedContacts:   { contact: LinkedContact }[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

type VendorFormProps = {
  initialData?: VendorRow | null;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Accounting", "Agriculture", "Automotive", "Construction", "Consulting",
  "Education", "Finance", "Healthcare", "Hospitality", "Information Technology",
  "Legal", "Manufacturing", "Media", "Real Estate", "Retail",
  "Transportation", "Wholesale", "Other",
];

const COUNTRIES = [
  "UAE", "India", "USA", "UK", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
];

const PHONE_CODES = ["+971", "+91", "+1", "+44", "+966", "+974", "+965", "+973", "+968"];

const TAX_TREATMENTS = [
  "Registered Business - Regular",
  "Registered Business - Composition",
  "Unregistered Business",
  "Consumer",
  "Overseas",
  "Special Economic Zone",
];

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20 transition-colors";
const selectCls = `${inputCls} appearance-none`;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-sm font-medium text-zinc-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </p>
  );
}

// ─── Collapsible section (connected card style) ───────────────────────────────

type SectionProps = {
  title: string;
  badge?: number;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Section({ title, badge, optional, open, onToggle, children }: SectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 ">
          <span className="text-base font-semibold text-zinc-800">{title}</span>
          {badge !== undefined && (
            <span className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
              {badge}
            </span>
          )}
          {optional && (
            <span className="text-sm font-normal text-zinc-400">(optional)</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-5 text-zinc-400" />
        ) : (
          <ChevronDown className="size-5 text-zinc-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function VendorForm({ initialData, onCancel, onSaved }: VendorFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!initialData;

  // Logo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo ?? null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Sections — Basic open by default, rest collapsed
  const [basicOpen,      setBasicOpen]      = useState(true);
  const [taxOpen,        setTaxOpen]        = useState(false);
  const [addressOpen,    setAddressOpen]    = useState(false);
  const [contactsOpen,   setContactsOpen]   = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [attachOpen,     setAttachOpen]     = useState(false);

  // Linked contacts
  const [linkedIds, setLinkedIds] = useState<string[]>(
    initialData?.linkedContacts.map((lc) => lc.contact.id) ?? [],
  );
  const [linkedContacts, setLinkedContacts] = useState<LinkedContact[]>(
    initialData?.linkedContacts.map((lc) => lc.contact) ?? [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VendorCreateInput>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: {
      name:            initialData?.name            ?? "",
      logo:            initialData?.logo            ?? "",
      industry:        initialData?.industry        ?? "",
      country:         initialData?.country         ?? "",
      city:            initialData?.city            ?? "",
      vendorType:      initialData?.vendorType      ?? "COMPANY",
      email:           initialData?.email           ?? "",
      phoneCode:       initialData?.phoneCode       ?? "+971",
      phone:           initialData?.phone           ?? "",
      showEmailInDocs: initialData?.showEmailInDocs ?? false,
      showPhoneInDocs: initialData?.showPhoneInDocs ?? false,
      website:         initialData?.website         ?? "",
      gstNumber:       initialData?.gstNumber       ?? "",
      trn:             initialData?.trn             ?? "",
      vatNumber:       initialData?.vatNumber       ?? "",
      taxTreatment:    initialData?.taxTreatment    ?? "",
      addressCountry:  initialData?.addressCountry  ?? "",
      state:           initialData?.state           ?? "",
      district:        initialData?.district        ?? "",
      addressCity:     initialData?.addressCity     ?? "",
      buildingNumber:  initialData?.buildingNumber  ?? "",
      postalCode:      initialData?.postalCode      ?? "",
      streetAddress:   initialData?.streetAddress   ?? "",
      businessAlias:   initialData?.businessAlias   ?? "",
      defaultDueDays:  initialData?.defaultDueDays  ?? undefined,
      paymentAccount:  initialData?.paymentAccount  ?? "",
    },
  });

  // Logo upload handler
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

  // Linked contacts handlers
  function handleLinkContact(contact: LinkedContact) {
    setLinkedIds((prev) => (prev.includes(contact.id) ? prev : [...prev, contact.id]));
    setLinkedContacts((prev) =>
      prev.find((c) => c.id === contact.id) ? prev : [...prev, contact],
    );
  }
  function handleUnlinkContact(contactId: string) {
    setLinkedIds((prev) => prev.filter((id) => id !== contactId));
    setLinkedContacts((prev) => prev.filter((c) => c.id !== contactId));
  }

  const saveMutation = useMutation({
    mutationFn: async (data: VendorCreateInput) => {
      const url    = isEdit ? `/api/vendors/${initialData!.id}` : "/api/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, linkedContactIds: linkedIds }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save vendor");
      return body as { vendor: VendorRow };
    },
    onSuccess: ({ vendor }) => {
      toast.success(isEdit ? "Vendor updated" : "Vendor added");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      if (onSaved) {
        onSaved(vendor.id);
      } else {
        router.push(`/purchases/vendors/${vendor.id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (data: VendorCreateInput) => saveMutation.mutate(data);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ─── Outer card ─────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">

          {/* ── Basic Information ── */}
          <Section
            title="Basic Information"
            open={basicOpen}
            onToggle={() => setBasicOpen((v) => !v)}
          >
            {/* Logo */}
            <div className="mb-6">
              <FieldLabel>Upload Logo</FieldLabel>
              <p className="mb-3 text-xs text-zinc-400">
                JPG or PNG, Dimensions 1080×1080px and file size up to 20MB
              </p>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative size-16 shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo"
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
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
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

            {/* 2-column grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <FieldLabel required>Vendor&apos;s Business Name</FieldLabel>
                <input
                  {...register("name")}
                  placeholder="Business Name (Required)"
                  className={`${inputCls} ${errors.name ? "border-red-400" : ""}`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <FieldLabel>Vendor Industry</FieldLabel>
                <select {...register("industry")} className={selectCls}>
                  <option value="">-Select an Industry-</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Select Country</FieldLabel>
                <select {...register("country")} className={selectCls}>
                  <option value="">Select Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>City/Town</FieldLabel>
                <input
                  {...register("city")}
                  placeholder="City/Town Name"
                  className={inputCls}
                />
              </div>

              {/* Vendor Type — full width */}
              <div className="col-span-2">
                <FieldLabel>Vendor Type</FieldLabel>
                <div className="flex gap-3">
                  {(["INDIVIDUAL", "COMPANY"] as const).map((type) => (
                    <Controller
                      key={type}
                      control={control}
                      name="vendorType"
                      render={({ field }) => (
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            field.value === type
                              ? "border-[#7438dc] bg-[#7438dc]/5 text-[#7438dc]"
                              : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="radio"
                            value={type}
                            checked={field.value === type}
                            onChange={() => field.onChange(type)}
                            className="sr-only"
                          />
                          {type === "INDIVIDUAL" ? "Individual" : "Company"}
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Tax Information ── */}
          <Section
            title="Tax Information"
            optional
            open={taxOpen}
            onToggle={() => setTaxOpen((v) => !v)}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <FieldLabel>GST Number</FieldLabel>
                <input {...register("gstNumber")} placeholder="22AAAAA0000A1Z5" className={inputCls} />
              </div>
              <div>
                <FieldLabel>TRN</FieldLabel>
                <input {...register("trn")} placeholder="Add TRN (15 Digits)" className={inputCls} />
              </div>
              <div>
                <FieldLabel>VAT Number (TRN)</FieldLabel>
                <input {...register("vatNumber")} placeholder="VAT Number" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Tax Treatment</FieldLabel>
                <select {...register("taxTreatment")} className={selectCls}>
                  <option value="">Select Tax Treatment</option>
                  {TAX_TREATMENTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* ── Address ── */}
          <Section
            title="Address"
            optional
            open={addressOpen}
            onToggle={() => setAddressOpen((v) => !v)}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <FieldLabel>Country</FieldLabel>
                <select {...register("addressCountry")} className={selectCls}>
                  <option value="">Select Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>State / Province</FieldLabel>
                <input {...register("state")} placeholder="State / Province" className={inputCls} />
              </div>
              <div>
                <FieldLabel>District</FieldLabel>
                <input {...register("district")} placeholder="District" className={inputCls} />
              </div>
              <div>
                <FieldLabel>City / Town</FieldLabel>
                <input {...register("addressCity")} placeholder="City / Town" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Building Number</FieldLabel>
                <input {...register("buildingNumber")} placeholder="4 Digit Building Number" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Postal Code / Zip</FieldLabel>
                <input {...register("postalCode")} placeholder="Postal Code / Zip Code" className={inputCls} />
              </div>
              <div className="col-span-2">
                <FieldLabel>Street Address</FieldLabel>
                <input {...register("streetAddress")} placeholder="Street Address" className={inputCls} />
              </div>
            </div>
          </Section>

          {/* ── Linked Contacts ── */}
          <Section
            title="Linked Contacts"
            badge={linkedIds.length}
            open={contactsOpen}
            onToggle={() => setContactsOpen((v) => !v)}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-500">
                {linkedContacts.length === 0
                  ? "No contacts linked yet"
                  : `${linkedContacts.length} contact${linkedContacts.length > 1 ? "s" : ""} linked`}
              </p>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Link2 className="size-4" />
                Link Contact
              </button>
            </div>

            {linkedContacts.length > 0 && (
              <ul className="space-y-2">
                {linkedContacts.map((c) => {
                  const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                  const initials = `${c.firstName[0]}${c.lastName?.[0] ?? ""}`.toUpperCase();
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-2.5"
                    >
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={fullName}
                          className="size-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{fullName}</p>
                        {c.email && (
                          <p className="truncate text-xs text-zinc-500">{c.email}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlinkContact(c.id)}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Unlink"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mt-3 text-sm text-zinc-500 hover:text-zinc-700"
            >
              Select Contact to Link
            </button>
          </Section>

          {/* ── Additional Details ── */}
          <Section
            title="Additional Details"
            optional
            open={additionalOpen}
            onToggle={() => setAdditionalOpen((v) => !v)}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <FieldLabel>Business Alias</FieldLabel>
                <input {...register("businessAlias")} placeholder="Business Alias" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Website</FieldLabel>
                <input
                  {...register("website")}
                  placeholder="https://example.com"
                  className={`${inputCls} ${errors.website ? "border-red-400" : ""}`}
                />
                {errors.website && (
                  <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email</FieldLabel>
                <p className="mb-1.5 text-xs text-zinc-400">
                  Add to directly email documents from this app
                </p>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="vendor@example.com"
                  className={`${inputCls} ${errors.email ? "border-red-400" : ""}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <Controller
                    control={control}
                    name="showEmailInDocs"
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="size-4 rounded border-zinc-300 accent-[#7438dc]"
                      />
                    )}
                  />
                  Show Email in Documents
                </label>
              </div>

              {/* Phone */}
              <div>
                <FieldLabel>Phone No.</FieldLabel>
                <p className="mb-1.5 text-xs text-zinc-400">
                  Add to directly send WhatsApp documents
                </p>
                <div className="flex">
                  <select
                    {...register("phoneCode")}
                    className="h-10 w-24 shrink-0 rounded-l-md border border-r-0 border-zinc-200 bg-white px-2 text-sm text-zinc-700 outline-none focus:border-[#7438dc]"
                  >
                    {PHONE_CODES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    {...register("phone")}
                    placeholder="Phone number"
                    className="h-10 w-full rounded-r-md border border-zinc-200 px-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
                  />
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <Controller
                    control={control}
                    name="showPhoneInDocs"
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="size-4 rounded border-zinc-300 accent-[#7438dc]"
                      />
                    )}
                  />
                  Show Phone in Documents
                </label>
              </div>

              {/* Default Due Days */}
              <div>
                <FieldLabel>Default Due Date (Days)</FieldLabel>
                <p className="mb-1.5 text-xs text-zinc-400">
                  Documents for this vendor will default to this due date
                </p>
                <Controller
                  control={control}
                  name="defaultDueDays"
                  render={({ field }) => (
                    <input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="e.g., 30"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? undefined : Number(e.target.value),
                        )
                      }
                      className={inputCls}
                    />
                  )}
                />
              </div>

              {/* Payment Account */}
              <div>
                <FieldLabel>Payment Account</FieldLabel>
                <p className="mb-1.5 text-xs text-zinc-400">
                  Default account for documents with this vendor
                </p>
                <input
                  {...register("paymentAccount")}
                  placeholder="Payment account name"
                  className={inputCls}
                />
              </div>
            </div>
          </Section>

          {/* ── Attachments ── */}
          <Section
            title="Attachments"
            optional
            open={attachOpen}
            onToggle={() => setAttachOpen((v) => !v)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Paperclip className="size-4" />
              Add Attachments
            </button>
          </Section>

        </div>

        {/* ─── Footer ─────────────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-5 pb-6">
          <button
            type="submit"
            disabled={saveMutation.isPending || logoUploading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2] disabled:opacity-60"
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Vendor"}
          </button>
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : router.push("/purchases/vendors"))}
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
