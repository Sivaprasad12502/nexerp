"use client";

import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow } from "./quotation-preview";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const labelCls = "block text-xs font-medium text-zinc-600 mb-1";
const inputCls =
  "h-8 w-full rounded-md border border-zinc-200 px-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors";
const selectCls =
  "h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-[#7438dc] transition-colors";

const PRESET_COLORS = [
  "#7438dc", "#e03e3e", "#2563eb", "#16a34a",
  "#d97706", "#db2777", "#0891b2", "#374151",
];

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-800">{title}</span>
          {badge && (
            <span className="rounded bg-[#7438dc]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#7438dc]">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-zinc-400" />
        ) : (
          <ChevronDown className="size-4 text-zinc-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 hover:bg-zinc-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-zinc-300 accent-[#7438dc]"
      />
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  );
}

// ─── Template thumbnails ──────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "professional", label: "Professional" },
  { id: "modern",       label: "Modern"       },
  { id: "simple",       label: "Simple"       },
  { id: "classic",      label: "Classic"      },
] as const;

function TemplatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  const [idx, setIdx] = useState(() => TEMPLATES.findIndex((t) => t.id === value) ?? 0);

  const go = (dir: -1 | 1) => {
    const next = (idx + dir + TEMPLATES.length) % TEMPLATES.length;
    setIdx(next);
    onChange(TEMPLATES[next].id);
  };

  const current = TEMPLATES[idx];

  return (
    <div className="space-y-2">
      {/* Big card preview */}
      <div className="rounded-lg border-2 border-[#7438dc] p-3 bg-white relative">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="size-6 flex items-center justify-center rounded-full bg-[#7438dc]/10 text-[#7438dc] hover:bg-[#7438dc]/20 text-sm font-bold"
          >
            ‹
          </button>
          <span className="text-xs font-semibold text-zinc-700">{current.label}</span>
          <button
            type="button"
            onClick={() => go(1)}
            className="size-6 flex items-center justify-center rounded-full bg-[#7438dc]/10 text-[#7438dc] hover:bg-[#7438dc]/20 text-sm font-bold"
          >
            ›
          </button>
        </div>
        {/* Mini mockup */}
        <TemplateMockup template={current.id} />
        <div className="absolute top-2 right-2">
          <span className="text-[10px] bg-[#7438dc] text-white px-1.5 py-0.5 rounded">Selected</span>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setIdx(i); onChange(t.id); }}
            className={`size-2 rounded-full transition-colors ${i === idx ? "bg-[#7438dc]" : "bg-zinc-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateMockup({ template }: { template: string }) {
  if (template === "professional") {
    return (
      <div className="h-24 bg-zinc-50 rounded overflow-hidden text-[4px]">
        <div className="bg-[#7438dc] h-7 px-2 py-1 flex items-center justify-between">
          <div>
            <div className="bg-white/90 h-1.5 w-12 rounded mb-0.5" />
            <div className="bg-white/60 h-1 w-8 rounded" />
          </div>
          <div className="bg-white/20 h-5 w-6 rounded" />
        </div>
        <div className="px-2 pt-1.5 space-y-1">
          <div className="flex gap-1">
            <div className="flex-1 border border-zinc-200 rounded h-4" />
            <div className="flex-1 border border-zinc-200 rounded h-4" />
          </div>
          <div className="bg-zinc-200 h-1.5 rounded w-full" />
          <div className="bg-zinc-100 h-1 rounded w-3/4" />
          <div className="bg-zinc-100 h-1 rounded w-1/2" />
        </div>
      </div>
    );
  }
  if (template === "modern") {
    return (
      <div className="h-24 bg-white rounded overflow-hidden text-[4px] border border-zinc-100">
        <div className="border-b-2 border-[#7438dc] px-2 py-1 flex items-center justify-between">
          <div className="bg-zinc-200 h-4 w-6 rounded" />
          <div className="space-y-0.5 text-right">
            <div className="bg-zinc-300 h-1 w-8 rounded" />
            <div className="bg-zinc-200 h-1 w-6 rounded" />
          </div>
        </div>
        <div className="px-2 pt-1.5 space-y-1">
          <div className="flex gap-1">
            <div className="flex-1 bg-zinc-100 rounded h-4" />
            <div className="flex-1 bg-zinc-100 rounded h-4" />
          </div>
          <div className="bg-zinc-200 h-1.5 rounded" />
          <div className="bg-zinc-100 h-1 rounded w-3/4" />
        </div>
      </div>
    );
  }
  if (template === "classic") {
    return (
      <div className="h-24 bg-white rounded overflow-hidden text-[4px] border border-zinc-100 text-center">
        <div className="bg-zinc-100 h-4 w-10 rounded mx-auto mt-1.5 mb-1" />
        <div className="bg-zinc-300 h-1.5 w-14 rounded mx-auto mb-0.5" />
        <div className="bg-zinc-200 h-1 w-10 rounded mx-auto mb-1.5" />
        <div className="border-t border-zinc-300 mx-2" />
        <div className="px-2 pt-1 space-y-1">
          <div className="bg-zinc-200 h-1.5 rounded" />
          <div className="bg-zinc-100 h-1 rounded w-3/4 mx-auto" />
        </div>
      </div>
    );
  }
  // simple
  return (
    <div className="h-24 bg-white rounded overflow-hidden text-[4px] border border-zinc-100">
      <div className="px-2 pt-2 pb-1 flex justify-between items-start">
        <div>
          <div className="bg-zinc-200 h-2 w-10 rounded mb-0.5" />
          <div className="bg-zinc-100 h-1 w-6 rounded" />
        </div>
        <div className="space-y-0.5">
          <div className="bg-zinc-200 h-1 w-8 rounded" />
          <div className="bg-zinc-100 h-1 w-6 rounded" />
        </div>
      </div>
      <div className="px-2 space-y-1">
        <div className="flex gap-1">
          <div className="flex-1 bg-zinc-100 rounded h-3" />
          <div className="flex-1 bg-zinc-100 rounded h-3" />
        </div>
        <div className="bg-zinc-200 h-1.5 rounded" />
        <div className="bg-zinc-100 h-1 rounded w-2/3" />
      </div>
    </div>
  );
}

// ─── Image upload field ───────────────────────────────────────────────────────

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error(`${label} upload failed`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className={labelCls}>{label}</label>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="h-14 max-w-full rounded border border-zinc-200 object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200 hover:bg-red-50"
          >
            <X className="size-3 text-zinc-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-200 text-sm text-zinc-400 hover:border-[#7438dc] hover:text-[#7438dc] transition-colors"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <><Upload className="size-4" /> Upload</>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function QuotationSettingsPanel({
  settings,
  onSettingsChange,
  businessSettings,
  onBusinessSettingsChange,
  documentLabel = "Quotation",
}: {
  settings: QuotationSettings;
  onSettingsChange: (patch: Partial<QuotationSettings>) => void;
  businessSettings: BusinessSettingsRow;
  onBusinessSettingsChange: (patch: Partial<BusinessSettingsRow>) => void;
  documentLabel?: string;
}) {
  const s = settings;
  const bs = businessSettings;
  const set = (patch: Partial<QuotationSettings>) => onSettingsChange(patch);
  const setBs = (patch: Partial<BusinessSettingsRow>) => onBusinessSettingsChange(patch);

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 overflow-hidden">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="font-semibold text-zinc-900">{documentLabel} Settings</h2>
      </div>

      {/* ── Advanced Settings ── */}
      <Section title="Advanced Settings" defaultOpen={false}>
        <div className="space-y-0.5">
          <div className="mb-3">
            <label className={labelCls}>Display Unit As</label>
            <select
              value={s.displayUnitAs}
              onChange={(e) => set({ displayUnitAs: e.target.value as QuotationSettings["displayUnitAs"] })}
              className={selectCls}
            >
              <option value="mergeWithQuantity">Merge with Quantity</option>
              <option value="mergeWithName">Merge with Name</option>
              <option value="doNotShow">Do not show</option>
            </select>
          </div>
          <Toggle label="Show Tax Summary in Invoice" checked={s.showTaxSummary} onChange={(v) => set({ showTaxSummary: v })} />
          <Toggle label="Hide Country of Supply" checked={s.hideCountryOfSupply} onChange={(v) => set({ hideCountryOfSupply: v })} />
          <Toggle label="Add Original Images in Line Items" checked={s.addOriginalImages} onChange={(v) => set({ addOriginalImages: v })} />
          <Toggle label="Show Thumbnails in Separate Column" checked={s.showThumbnails} onChange={(v) => set({ showThumbnails: v })} />
          <Toggle label="Show Description in Full Width" checked={s.showFullWidthDescription} onChange={(v) => set({ showFullWidthDescription: v })} />
          <Toggle label="Hide Subtotal for Group Items" checked={s.hideSubtotalForGroups} onChange={(v) => set({ hideSubtotalForGroups: v })} />
          <Toggle label={`Show SKU in ${documentLabel}`} checked={s.showSku} onChange={(v) => set({ showSku: v })} />
          <Toggle label="Show Serial Numbers" checked={s.showSerialNumbers} onChange={(v) => set({ showSerialNumbers: v })} />
          <Toggle label="Display Batch Details" checked={s.showBatchDetails} onChange={(v) => set({ showBatchDetails: v })} />
          <Toggle label="Show HSN Summary" checked={s.showHsnSummary} onChange={(v) => set({ showHsnSummary: v })} />
        </div>
      </Section>

      {/* ── Customize Design ── */}
      <Section title={`Customize ${documentLabel} Design`} badge="✨" defaultOpen={true}>
        {/* 1. Select Template */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            1. Select Template
          </p>
          <TemplatePicker
            value={s.template}
            onChange={(t) => set({ template: t as QuotationSettings["template"] })}
          />
        </div>

        {/* 2. Color */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            2. Color
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ themeColor: c })}
                title={c}
                className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: s.themeColor === c ? "#374151" : "transparent",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s.themeColor}
              onChange={(e) => set({ themeColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-zinc-200 p-0.5"
            />
            <input
              type="text"
              value={s.themeColor}
              onChange={(e) => set({ themeColor: e.target.value })}
              placeholder="#7438dc"
              className={`${inputCls} flex-1`}
            />
          </div>
        </div>

        {/* 3. Font */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            3. Font
          </p>
          <select
            value={s.fontFamily}
            onChange={(e) => set({ fontFamily: e.target.value as QuotationSettings["fontFamily"] })}
            className={selectCls}
          >
            <option value="inter">Inter (Default)</option>
            <option value="serif">Serif (Georgia)</option>
            <option value="sans">Sans (Helvetica)</option>
            <option value="mono">Mono (Courier)</option>
          </select>
        </div>

        {/* 4. Letterhead */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              4. Letterhead
            </p>
            <Toggle label="" checked={s.showLetterhead} onChange={(v) => set({ showLetterhead: v })} />
          </div>
          {s.showLetterhead && (
            <ImageUploadField
              label="Letterhead Image"
              value={bs.letterheadUrl}
              onChange={(url) => setBs({ letterheadUrl: url })}
            />
          )}
        </div>

        {/* 5. Footer */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              5. Footer
            </p>
            <Toggle label="" checked={s.showFooter} onChange={(v) => set({ showFooter: v })} />
          </div>
          {s.showFooter && (
            <div>
              <label className={labelCls}>Footer Text</label>
              <textarea
                value={bs.footerText ?? ""}
                onChange={(e) => setBs({ footerText: e.target.value })}
                rows={2}
                placeholder="Enter footer text…"
                className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
              />
            </div>
          )}
        </div>

        {/* 6. Watermark */}
        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              6. Watermark
            </p>
            <Toggle label="" checked={s.showWatermark} onChange={(v) => set({ showWatermark: v })} />
          </div>
          {s.showWatermark && (
            <div className="space-y-2">
              <div>
                <label className={labelCls}>Watermark Text</label>
                <input
                  type="text"
                  value={bs.watermarkText ?? ""}
                  onChange={(e) => setBs({ watermarkText: e.target.value })}
                  placeholder="e.g. DRAFT"
                  className={inputCls}
                />
              </div>
              <ImageUploadField
                label="Or Watermark Image"
                value={bs.watermarkUrl}
                onChange={(url) => setBs({ watermarkUrl: url })}
              />
              <div>
                <label className={labelCls}>
                  Opacity: {Math.round((s.watermarkOpacity ?? 0.15) * 100)}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={Math.round((s.watermarkOpacity ?? 0.15) * 100)}
                  onChange={(e) =>
                    set({ watermarkOpacity: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#7438dc]"
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── PDF Configuration ── */}
      <Section title="PDF Configuration" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Page Size</label>
            <select
              value={s.pageSize}
              onChange={(e) => set({ pageSize: e.target.value as QuotationSettings["pageSize"] })}
              className={selectCls}
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Margin</label>
            <select
              value={s.margin}
              onChange={(e) => set({ margin: e.target.value as QuotationSettings["margin"] })}
              className={selectCls}
            >
              <option value="narrow">Narrow</option>
              <option value="normal">Normal (Recommended)</option>
              <option value="wide">Wide</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Script / Number Format</label>
            <select
              value={s.numberFormat}
              onChange={(e) => set({ numberFormat: e.target.value })}
              className={selectCls}
            >
              <option value="en-IN">Indian (1,00,000.00)</option>
              <option value="en-US">US / International (100,000.00)</option>
              <option value="ar-AE">Arabic (١٠٠٬٠٠٠٫٠٠)</option>
              <option value="de-DE">European (100.000,00)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* ── Bank Details ── */}
      <Section title="Bank Details" defaultOpen={false}>
        <Toggle
          label={`Show Bank Details in ${documentLabel}`}
          checked={s.showBankDetails}
          onChange={(v) => set({ showBankDetails: v })}
        />
        {s.showBankDetails && (
          <div className="mt-3 space-y-2">
            {(
              [
                ["bankName", "Bank Name"],
                ["bankAccountName", "Account Name"],
                ["bankAccountNumber", "Account Number"],
                ["bankIfsc", "IFSC / IBAN"],
                ["bankBranch", "Branch"],
                ["bankSwift", "SWIFT / BIC"],
              ] as [keyof BusinessSettingsRow, string][]
            ).map(([key, lbl]) => (
              <div key={key}>
                <label className={labelCls}>{lbl}</label>
                <input
                  type="text"
                  value={(bs[key] as string) ?? ""}
                  onChange={(e) => setBs({ [key]: e.target.value })}
                  placeholder={lbl}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── UPI Details ── */}
      <Section title="UPI Details" defaultOpen={false}>
        <Toggle
          label={`Show UPI Details in ${documentLabel}`}
          checked={s.showUpiDetails}
          onChange={(v) => set({ showUpiDetails: v })}
        />
        {s.showUpiDetails && (
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelCls}>UPI ID</label>
              <input
                type="text"
                value={bs.upiId ?? ""}
                onChange={(e) => setBs({ upiId: e.target.value })}
                placeholder="example@upi"
                className={inputCls}
              />
            </div>
            <ImageUploadField
              label="UPI QR Code"
              value={bs.upiQrUrl}
              onChange={(url) => setBs({ upiQrUrl: url })}
            />
          </div>
        )}
      </Section>

      {/* ── Batch Summary ── */}
      <Section title="Batch Summary" defaultOpen={false}>
        <Toggle
          label={`Show Batch Summary in ${documentLabel}`}
          checked={s.showBatchSummary}
          onChange={(v) => set({ showBatchSummary: v })}
        />
        {s.showBatchSummary && (
          <p className="mt-2 text-xs text-zinc-500">
            Batch details will be displayed in a summary table at the bottom of the {documentLabel.toLowerCase()} when
            batch information is available on line items.
          </p>
        )}
      </Section>
    </div>
  );
}
