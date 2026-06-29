import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import { withAlpha } from "./constants";

type PartyVariant = "tinted" | "bordered" | "simple";

type PartyBoxesProps = {
  q: QuotationRow;
  themeColor: string;
  leftLabel?: string;
  rightLabel?: string;
  variant?: PartyVariant;
};

export function PartyBoxes({
  q,
  themeColor,
  leftLabel = "Billed By",
  rightLabel = "Billed To",
  variant = "tinted",
}: PartyBoxesProps) {
  const boxStyle =
    variant === "tinted"
      ? { backgroundColor: withAlpha(themeColor, 0.08), borderColor: withAlpha(themeColor, 0.2) }
      : variant === "simple"
        ? { backgroundColor: "#fafafa", borderColor: "#e4e4e7" }
        : { borderColor: "#e4e4e7" };

  const labelStyle = { color: themeColor };

  return (
    <div className="mb-6 grid grid-cols-2 gap-4">
      <div className="rounded border p-4" style={boxStyle}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
          {leftLabel}
        </p>
        {q.fromName && <p className="text-sm font-semibold">{q.fromName}</p>}
        {q.fromAddress && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">{q.fromAddress}</p>
        )}
        {q.fromGstin && <p className="mt-1 text-xs text-zinc-500">GSTIN: {q.fromGstin}</p>}
        {q.fromPan && <p className="text-xs text-zinc-500">PAN: {q.fromPan}</p>}
      </div>
      <div className="rounded border p-4" style={boxStyle}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
          {rightLabel}
        </p>
        {q.clientName && <p className="text-sm font-semibold">{q.clientName}</p>}
        {q.clientAddress && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">{q.clientAddress}</p>
        )}
        {q.clientGstin && (
          <p className="mt-1 text-xs text-zinc-500">GSTIN / TRN: {q.clientGstin}</p>
        )}
      </div>
    </div>
  );
}
