"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Factory,
  HardHat,
  Monitor,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";

import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { businessSchema, type BusinessInput } from "@/lib/validations/business";
import {
  clearDocumentAuthContext,
  isPublicDocumentCallback,
  persistDocumentAuthContext,
  resolveAuthCallback,
} from "@/lib/public-auth-flow";

const PURPLE = "#6d3bd6";

const categories: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Manufacturer", desc: "Produce & sell goods.", icon: Factory },
  { title: "Trading", desc: "Buy & resell goods.", icon: Package },
  { title: "Retail", desc: "Sell via physical stores.", icon: Store },
  { title: "Online", desc: "Online store or marketplace.", icon: ShoppingCart },
  { title: "Professional Services", desc: "Provide expertise & consulting.", icon: Briefcase },
  { title: "Contractor", desc: "End-to-end project delivery.", icon: HardHat },
  { title: "Software", desc: "Sell software or digital products.", icon: Monitor },
  { title: "Something else", desc: "My business is different.", icon: Sparkles },
];

const OnBoardingBusinessInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const resolvedCallback = resolveAuthCallback(rawCallback);
  const callbackUrl = resolvedCallback ?? "/dashboard";
  const fromDocument = isPublicDocumentCallback(resolvedCallback);
  const { update: updateSession } = useSession();

  useEffect(() => {
    if (rawCallback) {
      persistDocumentAuthContext(rawCallback, null);
    }
  }, [rawCallback]);
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      country: "United Arab Emirates (UAE)",
      currency: "United Arab Emirates Dirham (AED , AED)",
      hasGst: true,
      usedFor: [],
      teamSize: "",
      name: "",
      phone: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const hasGst = watch("hasGst");

  const handleStep1Continue = async () => {
    const valid = await trigger(["name", "teamSize", "phone", "country", "currency"]);
    if (valid) setStep(2);
  };

  const onFinish = async (data: BusinessInput) => {
    setServerError(null);
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setServerError(
        typeof body.error === "string" ? body.error : "Failed to save. Please try again."
      );
      return;
    }

    await updateSession();
    clearDocumentAuthContext();
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      <OnboardingHeader />

      {fromDocument && (
        <p className="mx-auto max-w-md px-4 pt-4 text-center text-sm text-zinc-600">
          Complete setup to accept your document.
        </p>
      )}

      {/* Stepper */}
      <div className="mx-auto flex max-w-md items-center justify-center gap-3 px-4 py-6 sm:py-8">
        <StepBadge n={1} label="Basic Details" state={step === 1 ? "active" : "done"} />
        <ChevronDown className="size-4 -rotate-90 text-zinc-300" />
        <StepBadge n={2} label="Additional Details" state={step === 2 ? "active" : "todo"} />
      </div>

      {/* Card */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          {serverError && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          {step === 1 ? (
            <BasicDetails
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              hasGst={hasGst}
              onContinue={handleStep1Continue}
            />
          ) : (
            <AdditionalDetails
              errors={errors}
              watch={watch}
              setValue={setValue}
              onBack={() => setStep(1)}
              onFinish={handleSubmit(onFinish)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

      {/* Chat widget */}
      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: PURPLE }}
      >
        <Sparkles className="size-5" />
      </button>
    </div>
  );
};

/* ---------- Stepper badge ---------- */

function StepBadge({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: "active" | "done" | "todo";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
          state === "done"
            ? "bg-[#6d3bd6] text-white"
            : state === "active"
              ? "border-2 border-[#6d3bd6] text-[#6d3bd6]"
              : "border-2 border-zinc-300 text-zinc-400"
        }`}
      >
        {state === "done" ? <Check className="size-3.5" /> : n}
      </span>
      <span className={`text-sm font-medium ${state === "todo" ? "text-zinc-400" : "text-zinc-800"}`}>
        {label}
      </span>
    </div>
  );
}

/* ---------- Step 1 ---------- */

type FormProps = {
  register: ReturnType<typeof useForm<BusinessInput>>["register"];
  errors: ReturnType<typeof useForm<BusinessInput>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<BusinessInput>>["watch"];
  setValue: ReturnType<typeof useForm<BusinessInput>>["setValue"];
};

function BasicDetails({
  register,
  errors,
  watch,
  setValue,
  hasGst,
  onContinue,
}: FormProps & { hasGst: boolean; onContinue: () => void }) {
  const [showBrandInput, setShowBrandInput] = useState(false);

  return (
    <div>
      <h1 className="text-center text-2xl font-bold text-zinc-900">
        Let&apos;s setup your business
      </h1>

      <div className="mt-8 space-y-6">
        {/* 1. Business Name */}
        <div>
          <Label num="1" required>Business Name</Label>
          <Hint>Official Name used across Accounting documents and reports.</Hint>
          <input
            type="text"
            placeholder="If you're a freelancer, add your personal name"
            {...register("name")}
            className={inputCls(!!errors.name)}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}

          {!showBrandInput ? (
            <button
              type="button"
              onClick={() => setShowBrandInput(true)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#6d3bd6]"
            >
              <span className="flex size-5 items-center justify-center rounded border border-[#6d3bd6]">
                <Plus className="size-3.5" />
              </span>
              Add Brand or Display name
            </button>
          ) : (
            <div className="mt-4">
              <Label num="1b">Brand or Display name</Label>
              <input
                type="text"
                {...register("brandName")}
                className={inputCls(false)}
              />
            </div>
          )}
        </div>

        {/* 2 & 3 */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label num="2" required>Team Size</Label>
            <SelectBox error={!!errors.teamSize}>
              <select {...register("teamSize")} className={`${inputCls(!!errors.teamSize)} cursor-pointer appearance-none pr-10`}>
                <option value="" disabled>Select Team Size</option>
                <option>Just me</option>
                <option>2 - 10</option>
                <option>11 - 50</option>
                <option>51 - 200</option>
                <option>200+</option>
              </select>
            </SelectBox>
            {errors.teamSize && <p className="mt-1 text-xs text-red-500">{errors.teamSize.message}</p>}
          </div>
          <div>
            <Label num="3">Website</Label>
            <input type="url" placeholder="Your Work Website" {...register("website")} className={inputCls(!!errors.website)} />
            {errors.website && <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>}
          </div>
        </div>

        {/* 4. Phone */}
        <div>
          <Label num="4" required>Phone Number</Label>
          <Hint>Contact phone number associated with your business</Hint>
          <div className={`flex h-12 items-center rounded-lg border bg-white focus-within:border-[#6d3bd6] focus-within:ring-2 focus-within:ring-[#6d3bd6]/20 ${errors.phone ? "border-red-400" : "border-zinc-300"}`}>
            <span className="flex items-center gap-1 border-r border-zinc-300 px-3 text-sm text-zinc-700">
              <span className="text-base leading-none">🇦🇪</span>
              <ChevronDown className="size-3.5 text-zinc-400" />
            </span>
            <input type="tel" {...register("phone")} className="h-full w-full rounded-r-lg bg-transparent px-3 text-sm text-zinc-900 outline-none" />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        {/* 5 & 6 */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label num="5" required>Country</Label>
            <SelectBox error={!!errors.country}>
              <select {...register("country")} className={`${inputCls(!!errors.country)} cursor-pointer appearance-none pr-10`}>
                {/* <option>India</option>
                <option>United States</option>
                <option>United Kingdom</option> */}
                <option>United Arab Emirates</option>
                {/* <option>Canada</option> */}
              </select>
            </SelectBox>
          </div>
          <div>
            <Label num="6" required>Currency</Label>
            <SelectBox error={!!errors.currency}>
              <select {...register("currency")} className={`${inputCls(!!errors.currency)} cursor-pointer appearance-none pr-10`}>
                <option>Indian Rupee(INR, ₹)</option>
                <option>US Dollar(USD, $)</option>
                <option>Euro(EUR, €)</option>
                <option>British Pound(GBP, £)</option>
                <option>UAE Dirham(AED, د.إ)</option>
              </select>
            </SelectBox>
          </div>
        </div>

        {/* 7. GST */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label num="7" required>Are you a VAT registered business?</Label>
              <Hint>
               Add your TRN number to unlock eInvoicing & VAT reports.

              </Hint>
            </div>
            <Toggle on={hasGst} onChange={() => setValue("hasGst", !hasGst)} />
          </div>
          {hasGst && (
            <input
              type="text"
              placeholder="Enter Your GST Number"
              {...register("gstNumber")}
              className={`${inputCls(false)} mt-3`}
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors"
        style={{ backgroundColor: PURPLE }}
      >
        Continue
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

/* ---------- Step 2 ---------- */

function AdditionalDetails({
  errors,
  watch,
  setValue,
  onBack,
  onFinish,
  isSubmitting,
}: Omit<FormProps, "register"> & {
  onBack: () => void;
  onFinish: () => void;
  isSubmitting: boolean;
}) {
  const usedFor = watch("usedFor") ?? [];
  const category = watch("category");

  return (
    <div>
      <h1 className="text-center text-2xl font-bold text-zinc-900">
        Tell us more about your business
      </h1>

      <div className="mt-8">
        <Label num="1" required>What do you want to use Refrens for?</Label>
        <Hint>Help us serve you better!</Hint>
        <GroupedMultiSelect
          selected={usedFor}
          onChange={(v) => setValue("usedFor", v, { shouldValidate: true })}
        />
        {errors.usedFor && (
          <p className="mt-1 text-xs text-red-500">{errors.usedFor.message as string}</p>
        )}
      </div>

      <div className="mt-6">
        <Label num="2">What best describes your business?</Label>
        <Hint>
          Choose the category that matches how your business operates to get a personalized onboarding experience.
        </Hint>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {categories.map(({ title, desc, icon: Icon }) => {
            const selected = category === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setValue("category", title)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-[#6d3bd6] bg-[#6d3bd6]/5 ring-1 ring-[#6d3bd6]"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                  <span className="block text-xs text-zinc-500">{desc}</span>
                </span>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-[#6d3bd6] bg-[#6d3bd6]" : "border-zinc-300"
                  }`}
                >
                  {selected && <span className="size-2 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={isSubmitting}
          className="flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
          style={{ backgroundColor: PURPLE }}
        >
          {isSubmitting ? "Saving…" : "Finish Setup"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Grouped multi-select ---------- */

const USE_FOR_GROUPS = [
  {
    label: "Accounting",
    children: [
      "End-to-end accounting",
      "Accounting services",
      "GST Compliance",
      "Tax filing & reports",
      "Journal & ledger",
    ],
  },
  {
    label: "Invoicing",
    children: [
      "Create & send invoices",
      "Track payments",
      "Recurring invoices",
      "Multi-currency invoicing",
    ],
  },
  {
    label: "Purchases & Expenses",
    children: [
      "Purchase orders",
      "Bills & vendor payments",
      "Expense tracking",
      "Debit notes",
    ],
  },
  {
    label: "Inventory",
    children: ["Stock management", "Inventory reports", "Item catalog"],
  },
  {
    label: "Quotations & Estimates",
    children: ["Create quotations", "Proforma invoices", "Sales orders"],
  },
  {
    label: "CRM & Contacts",
    children: ["Client management", "Lead tracking", "Vendor management"],
  },
];

function GroupedMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Accounting"]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (item: string) =>
    onChange(
      selected.includes(item) ? selected.filter((s) => s !== item) : [...selected, item]
    );

  const removeChip = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== item));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );

  const toggleGroupAll = (
    group: (typeof USE_FOR_GROUPS)[0],
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const allSelected = group.children.every((c) => selected.includes(c));
    if (allSelected) {
      onChange(selected.filter((s) => !group.children.includes(s)));
    } else {
      const toAdd = group.children.filter((c) => !selected.includes(c));
      onChange([...selected, ...toAdd]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-12 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border bg-white px-3 py-2 transition-colors ${
          open ? "border-[#6d3bd6] ring-2 ring-[#6d3bd6]/20" : "border-zinc-300 hover:border-zinc-400"
        }`}
      >
        {selected.length === 0 && <span className="text-sm text-zinc-400">Select...</span>}
        {selected.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700"
          >
            {item}
            <button
              type="button"
              onClick={(e) => removeChip(item, e)}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <div className="ml-auto flex items-center gap-1 pl-2">
          {selected.length > 0 && (
            <button type="button" onClick={clearAll} className="text-zinc-400 hover:text-zinc-600">
              <X className="size-4" />
            </button>
          )}
          <ChevronDown className={`size-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {USE_FOR_GROUPS.map((group) => {
            const groupOpen = openGroups.includes(group.label);
            const allChecked = group.children.every((c) => selected.includes(c));
            const someChecked = group.children.some((c) => selected.includes(c));

            return (
              <div key={group.label} className="border-b border-zinc-100 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
                >
                  <span
                    onClick={(e) => toggleGroupAll(group, e)}
                    className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      allChecked
                        ? "border-[#6d3bd6] bg-[#6d3bd6]"
                        : someChecked
                          ? "border-[#6d3bd6] bg-[#6d3bd6]/20"
                          : "border-zinc-300"
                    }`}
                  >
                    {allChecked && <Check className="size-2.5 text-white" />}
                    {!allChecked && someChecked && (
                      <span className="size-1.5 rounded-sm bg-[#6d3bd6]" />
                    )}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-zinc-800">{group.label}</span>
                  <ChevronDown
                    className={`size-3.5 text-zinc-400 transition-transform ${groupOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {groupOpen && (
                  <ul className="pb-1">
                    {group.children.map((child) => {
                      const checked = selected.includes(child);
                      return (
                        <li key={child}>
                          <button
                            type="button"
                            onClick={() => toggle(child)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 pl-9 text-left hover:bg-zinc-50"
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                checked ? "border-[#6d3bd6] bg-[#6d3bd6]" : "border-zinc-300"
                              }`}
                            >
                              {checked && <Check className="size-2.5 text-white" />}
                            </span>
                            <span className="text-sm text-zinc-700">{child}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Shared bits ---------- */

const inputCls = (hasError: boolean) =>
  `h-12 w-full rounded-lg border bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-[#6d3bd6] focus:ring-2 focus:ring-[#6d3bd6]/20 ${
    hasError ? "border-red-400" : "border-zinc-300"
  }`;

function Label({
  num,
  required,
  children,
}: {
  num: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-zinc-900">
      {num}. {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-0.5 text-xs text-zinc-500">{children}</p>;
}

function SelectBox({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className={`relative ${error ? "ring-1 ring-red-400 rounded-lg" : ""}`}>
      {children}
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        on ? "bg-[#6d3bd6]" : "bg-zinc-300"
      }`}
    >
      <span
        className={`size-5 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const OnBoardingBusiness = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
    <OnBoardingBusinessInner />
  </Suspense>
);

export default OnBoardingBusiness;
