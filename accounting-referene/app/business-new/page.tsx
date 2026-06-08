"use client";

import { useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

import { OnboardingHeader } from "@/components/onboarding/onboarding-header";

const PURPLE = "#6d3bd6";

const categories: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Manufacturer", desc: "Produce & sell goods.", icon: Factory },
  { title: "Trading", desc: "Buy & resell goods.", icon: Package },
  { title: "Retail", desc: "Sell via physical stores.", icon: Store },
  { title: "Online", desc: "Online store or marketplace.", icon: ShoppingCart },
  {
    title: "Professional Services",
    desc: "Provide expertise & consulting.",
    icon: Briefcase,
  },
  { title: "Contractor", desc: "End-to-end project delivery.", icon: HardHat },
  {
    title: "Software",
    desc: "Sell software or digital products.",
    icon: Monitor,
  },
  {
    title: "Something else",
    desc: "My business is different.",
    icon: Sparkles,
  },
];

const OnBoardingBusiness = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [hasGst, setHasGst] = useState(true);
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      <OnboardingHeader />

      {/* Stepper */}
      <div className="mx-auto flex max-w-md items-center justify-center gap-3 px-4 py-6 sm:py-8">
        <Step
          n={1}
          label="Basic Details"
          state={step === 1 ? "active" : "done"}
        />
        <ChevronDown className="size-4 -rotate-90 text-zinc-300" />
        <Step
          n={2}
          label="Additional Details"
          state={step === 2 ? "active" : "todo"}
        />
      </div>

      {/* Card */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          {step === 1 ? (
            <BasicDetails
              hasGst={hasGst}
              setHasGst={setHasGst}
              onContinue={() => setStep(2)}
            />
          ) : (
            <AdditionalDetails
              category={category}
              setCategory={setCategory}
              onBack={() => setStep(1)}
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

/* ---------- Stepper item ---------- */

function Step({
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
      <span
        className={`text-sm font-medium ${
          state === "todo" ? "text-zinc-400" : "text-zinc-800"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ---------- Step 1 ---------- */

function BasicDetails({
  hasGst,
  setHasGst,
  onContinue,
}: {
  hasGst: boolean;
  setHasGst: (v: boolean) => void;
  onContinue: () => void;
}) {
  const [showBrandInput, setShowBrandInput] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
    >
      <h1 className="text-center text-2xl font-bold text-zinc-900">
        Let&apos;s setup your business
      </h1>

      <div className="mt-8 space-y-6">
        {/* 1. Business Name */}
        <div>
          <Label num="1" required>
            Business Name
          </Label>
          <Hint>
            Official Name used across Accounting documents and reports.
          </Hint>
          <input
            type="text"
            placeholder="If you're a freelancer, add your personal name"
            className={inputCls}
          />
          {!showBrandInput ? (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#6d3bd6]"
              onClick={() => setShowBrandInput(true)}
            >
              <span className="flex size-5 items-center justify-center rounded border border-[#6d3bd6]">
                <Plus className="size-3.5" />
              </span>
              Add Brand or Display name
            </button>
          ) : (
            <>
              <Label num="2" required >
               Brand or Display name
              </Label>
             
              <input
                type="text"
                placeholder=""
                className={inputCls}
              />
            </>
          )}
        </div>

        {/* 2 & 3 */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label num="2" required>
              Team Size
            </Label>
            <SelectBox defaultValue="">
              <option value="" disabled>
                Select Team Size
              </option>
              <option>Just me</option>
              <option>2 - 10</option>
              <option>11 - 50</option>
              <option>51 - 200</option>
              <option>200+</option>
            </SelectBox>
          </div>
          <div>
            <Label num="3">Website</Label>
            <input
              type="url"
              placeholder="Your Work Website"
              className={inputCls}
            />
          </div>
        </div>

        {/* 4. Phone */}
        <div>
          <Label num="4" required>
            Phone Number
          </Label>
          <Hint>Contact phone number associated with your business</Hint>
          <div className="flex h-12 items-center rounded-lg border border-zinc-300 bg-white focus-within:border-[#6d3bd6] focus-within:ring-2 focus-within:ring-[#6d3bd6]/20">
            <span className="flex items-center gap-1 border-r border-zinc-300 px-3 text-sm text-zinc-700">
              <span className="text-base leading-none">🇮🇳</span>
              <ChevronDown className="size-3.5 text-zinc-400" />
            </span>
            <input
              type="tel"
              defaultValue="+91 99475-52132"
              className="h-full w-full rounded-r-lg bg-transparent px-3 text-sm text-zinc-900 outline-none"
            />
          </div>
        </div>

        {/* 5 & 6 */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label num="5" required>
              Country
            </Label>
            <SelectBox defaultValue="India">
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>United Arab Emirates</option>
              <option>Canada</option>
            </SelectBox>
          </div>
          <div>
            <Label num="6" required>
              Currency
            </Label>
            <SelectBox defaultValue="Indian Rupee(INR, ₹)">
              <option>Indian Rupee(INR, ₹)</option>
              <option>US Dollar(USD, $)</option>
              <option>Euro(EUR, €)</option>
              <option>British Pound(GBP, £)</option>
              <option>UAE Dirham(AED, د.إ)</option>
            </SelectBox>
          </div>
        </div>

        {/* 7. GST */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label num="7" required>
                Have GST Number?
              </Label>
              <Hint>
                Add your{" "}
                <span className="font-medium text-[#6d3bd6]">GSTIN</span> to
                unlock smart AI and GST workflows.
              </Hint>
            </div>
            <Toggle on={hasGst} onChange={() => setHasGst(!hasGst)} />
          </div>
          {hasGst && (
            <input
              type="text"
              placeholder="Enter Your GST Number"
              className={`${inputCls} mt-3`}
            />
          )}
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors"
        style={{ backgroundColor: PURPLE }}
      >
        Continue
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

/* ---------- Step 2 ---------- */

function AdditionalDetails({
  category,
  setCategory,
  onBack,
}: {
  category: string | null;
  setCategory: (v: string) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <h1 className="text-center text-2xl font-bold text-zinc-900">
        Tell us more about your business
      </h1>

      <div className="mt-8">
        {/* Q1 */}
        <Label num="1" required>
          What do you want to use Refrens for?
        </Label>
        <Hint>Help us serve you better!</Hint>
        <SelectBox defaultValue="">
          <option value="" disabled>
            Select...
          </option>
          <option>Invoicing & Billing</option>
          <option>Accounting & Bookkeeping</option>
          <option>Inventory Management</option>
          <option>Expense Tracking</option>
          <option>Quotations & Estimates</option>
        </SelectBox>
      </div>

      {/* Q2 */}
      <div className="mt-6">
        <Label num="2">What best describes your business?</Label>
        <Hint>
          Choose the category that matches how your business operates to get a
          personalized onboarding experience.
        </Hint>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {categories.map(({ title, desc, icon: Icon }) => {
            const selected = category === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setCategory(title)}
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
                  <span className="block text-sm font-semibold text-zinc-900">
                    {title}
                  </span>
                  <span className="block text-xs text-zinc-500">{desc}</span>
                </span>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[#6d3bd6] bg-[#6d3bd6]"
                      : "border-zinc-300"
                  }`}
                >
                  {selected && (
                    <span className="size-2 rounded-full bg-white" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
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
          type="submit"
          className="flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ backgroundColor: PURPLE }}
        >
          Finish Setup
        </button>
      </div>
    </form>
  );
}

/* ---------- Shared bits ---------- */

const inputCls =
  "h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-[#6d3bd6] focus:ring-2 focus:ring-[#6d3bd6]/20";

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

function SelectBox({
  children,
  defaultValue,
}: {
  children: React.ReactNode;
  defaultValue?: string;
}) {
  return (
    <div className="relative">
      <select
        defaultValue={defaultValue}
        className={`${inputCls} cursor-pointer appearance-none pr-10`}
      >
        {children}
      </select>
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

export default OnBoardingBusiness;
