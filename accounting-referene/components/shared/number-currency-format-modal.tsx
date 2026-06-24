"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import {
  DECIMAL_DIGIT_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
} from "@/lib/validations/payment-receipt";

export type NumberCurrencyFormat = {
  numberFormat: string;
  decimalDigits: number;
  customCurrencySymbol: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  value: NumberCurrencyFormat;
  onSave: (value: NumberCurrencyFormat) => void;
};

export function NumberCurrencyFormatModal({ open, onClose, value, onSave }: Props) {
  const [numberFormat, setNumberFormat] = useState(value.numberFormat);
  const [decimalDigits, setDecimalDigits] = useState(value.decimalDigits);
  const [customSymbol, setCustomSymbol] = useState(value.customCurrencySymbol);

  useEffect(() => {
    if (!open) return;
    setNumberFormat(value.numberFormat);
    setDecimalDigits(value.decimalDigits);
    setCustomSymbol(value.customCurrencySymbol);
  }, [open, value]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Number and Currency Format"
      description="Change Number Systems"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium text-zinc-700">Select Number Format</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NUMBER_FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border p-4 ${
                  numberFormat === opt.value
                    ? "border-[#7438dc] ring-2 ring-[#7438dc]/20"
                    : "border-zinc-200"
                }`}
              >
                <input
                  type="radio"
                  name="numberFormat"
                  value={opt.value}
                  checked={numberFormat === opt.value}
                  onChange={() => setNumberFormat(opt.value)}
                  className="sr-only"
                />
                <p className="text-lg font-semibold text-zinc-900">{opt.example}</p>
                <p className="text-xs text-zinc-500">{opt.label}</p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-zinc-700">Select Decimal Digits</p>
          <div className="flex flex-wrap gap-4">
            {DECIMAL_DIGIT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="decimalDigits"
                  checked={decimalDigits === opt.value}
                  onChange={() => setDecimalDigits(opt.value)}
                  className="accent-[#7438dc]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Add Custom Currency Symbol
          </label>
          <input
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            placeholder="e.g. ₹"
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              onSave({
                numberFormat,
                decimalDigits,
                customCurrencySymbol: customSymbol,
              });
              onClose();
            }}
            className="rounded-md bg-[#7438dc] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
