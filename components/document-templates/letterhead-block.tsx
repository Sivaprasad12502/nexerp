import type { BusinessSettingsRow } from "./types";
import type { QuotationSettings } from "@/lib/validations/quotation";

export function LetterheadBlock({
  settings,
  bs,
}: {
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
}) {
  if (!settings.showLetterhead || !bs.letterheadUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bs.letterheadUrl}
      alt="Letterhead"
      className="mb-4 max-h-24 w-full object-contain"
    />
  );
}
