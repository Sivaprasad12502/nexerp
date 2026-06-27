import { numberToWords } from "@/lib/quotation-utils";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow, QuotationTotals } from "./types";
import { BankUpiCompact } from "./bank-upi-footer";
import { TotalsBlock } from "./totals-block";

type SplitFooterProps = {
  q: QuotationRow;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  totals: QuotationTotals;
  themeColor: string;
  fmt: (n: number) => string;
};

export function SplitFooter({
  q,
  settings,
  bs,
  totals,
  themeColor,
  fmt,
}: SplitFooterProps) {
  return (
    <div className="mt-4 flex items-start justify-between gap-4">
      <BankUpiCompact settings={settings} bs={bs} themeColor={themeColor} />
      <TotalsBlock
        q={q}
        totals={totals}
        themeColor={themeColor}
        fmt={fmt}
        variant="highlight"
      />
    </div>
  );
}

export function CustomFieldsBlock({ q }: { q: QuotationRow }) {
  if ((q.customFields ?? []).length === 0) return null;
  return (
    <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
      {q.customFields.map((cf, i) => (
        <div key={i} className="flex items-baseline gap-2 text-xs">
          <span className="text-zinc-500">{cf.label}:</span>
          <span className="font-medium text-zinc-800">{cf.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AmountInWordsBlock({
  q,
  totalAmount,
}: {
  q: QuotationRow;
  totalAmount: number;
}) {
  if (!q.amountInWords) return null;
  return (
    <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs italic text-zinc-600">
      {numberToWords(totalAmount, q.currency)}
    </div>
  );
}

export function DocumentNotesSection({
  q,
  settings,
  bs,
}: {
  q: QuotationRow;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
}) {
  const hasContent =
    q.termsAndConditions || q.notes || q.additionalInfo || q.contactDetails;
  if (!hasContent && !q.signature && !(settings.showFooter && bs.footerText)) {
    return null;
  }

  return (
    <>
      {hasContent && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {q.termsAndConditions && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Terms &amp; Conditions
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">{q.termsAndConditions}</p>
            </div>
          )}
          {q.notes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">{q.notes}</p>
            </div>
          )}
          {q.additionalInfo && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Additional Info
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">{q.additionalInfo}</p>
            </div>
          )}
          {q.contactDetails && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Contact
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">{q.contactDetails}</p>
            </div>
          )}
        </div>
      )}

      {q.signature && (
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.signature} alt="Signature" className="mb-1 h-14 object-contain" />
            <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-500">
              Authorized Signature
            </div>
          </div>
        </div>
      )}

      {settings.showFooter && bs.footerText && (
        <div className="mt-6 whitespace-pre-wrap border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
          {bs.footerText}
        </div>
      )}
    </>
  );
}
