"use client";

import { ChevronDown } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

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

const inputCls =
  "h-9 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors";
const selectCls =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc] transition-colors";
const labelCls = "block text-xs font-medium text-zinc-600 mb-1";

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
      className="mt-6 flex w-full items-center justify-between border-t border-zinc-100 pt-5 text-left text-sm font-medium text-zinc-950"
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

export type BusinessDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  name: string;
  onNameChange: (v: string) => void;
  country: string;
  onCountryChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  gstin: string;
  onGstinChange: (v: string) => void;
  pan: string;
  onPanChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  taxOpen: boolean;
  onTaxOpenChange: (v: boolean) => void;
  addrOpen: boolean;
  onAddrOpenChange: (v: boolean) => void;
  moreOpen: boolean;
  onMoreOpenChange: (v: boolean) => void;
  updatePrevious: boolean;
  onUpdatePreviousChange: (v: boolean) => void;
  updateFuture: boolean;
  onUpdateFutureChange: (v: boolean) => void;
};

export function BusinessDetailsModal({
  open,
  onClose,
  onSave,
  saving,
  name,
  onNameChange,
  country,
  onCountryChange,
  city,
  onCityChange,
  address,
  onAddressChange,
  gstin,
  onGstinChange,
  pan,
  onPanChange,
  phone,
  onPhoneChange,
  website,
  onWebsiteChange,
  taxOpen,
  onTaxOpenChange,
  addrOpen,
  onAddrOpenChange,
  moreOpen,
  onMoreOpenChange,
  updatePrevious,
  onUpdatePreviousChange,
  updateFuture,
  onUpdateFutureChange,
}: BusinessDetailsModalProps) {
  const handlePreviousChange = (checked: boolean) => {
    onUpdatePreviousChange(checked);
    if (checked) onUpdateFutureChange(false);
  };

  const handleFutureChange = (checked: boolean) => {
    onUpdateFutureChange(checked);
    if (checked) onUpdatePreviousChange(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Business details" size="lg">
      {/* Basic Information — always visible */}
      <div>
        <p className="text-sm font-medium text-zinc-900">Basic Information</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>
              Business Name<span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Business Name (Required)"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Select Country<span className="text-red-500">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              className={selectCls}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>City/Town</label>
            <input
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="City/Town Name"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <SectionTitle
        title="Tax Information"
        optional
        open={taxOpen}
        onToggle={() => onTaxOpenChange(!taxOpen)}
      />
      {taxOpen && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>GSTIN</label>
            <input
              value={gstin}
              onChange={(e) => onGstinChange(e.target.value)}
              placeholder="GST number"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>PAN</label>
            <input
              value={pan}
              onChange={(e) => onPanChange(e.target.value)}
              placeholder="PAN number"
              className={inputCls}
            />
          </div>
        </div>
      )}

      <SectionTitle
        title="Address"
        optional
        open={addrOpen}
        onToggle={() => onAddrOpenChange(!addrOpen)}
      />
      {addrOpen && (
        <div className="mt-4">
          <label className={labelCls}>Street Address</label>
          <textarea
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Full address"
            rows={3}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors resize-none"
          />
        </div>
      )}

      <SectionTitle
        title="Additional Details"
        optional
        open={moreOpen}
        onToggle={() => onMoreOpenChange(!moreOpen)}
      />
      {moreOpen && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Phone</label>
            <input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="Phone number"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
              placeholder="https://example.com"
              className={inputCls}
            />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3 border-t border-zinc-100 pt-5">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={updatePrevious}
            onChange={(e) => handlePreviousChange(e.target.checked)}
            className="mt-0.5 size-4 accent-[#7438dc]"
          />
          <span className="text-sm text-zinc-700">
            Update changes for Previous and Future documents.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={updateFuture}
            onChange={(e) => handleFutureChange(e.target.checked)}
            className="mt-0.5 size-4 accent-[#7438dc]"
          />
          <span className="text-sm text-zinc-700">Only update for Future documents</span>
        </label>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
