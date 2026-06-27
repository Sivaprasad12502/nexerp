import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationTotals } from "./types";

type TotalsBlockProps = {
  q: QuotationRow;
  totals: QuotationTotals;
  themeColor: string;
  fmt: (n: number) => string;
  variant?: "right" | "highlight";
};

export function TotalsBlock({
  q,
  totals,
  themeColor,
  fmt,
  variant = "right",
}: TotalsBlockProps) {
  const rows = (
    <>
      <div className="flex justify-between text-zinc-600">
        <span>Amount</span>
        <span>
          {q.currency} {fmt(totals.subTotal)}
        </span>
      </div>
      <div className="flex justify-between text-zinc-600">
        <span>TAX</span>
        <span>
          {q.currency} {fmt(totals.totalTax)}
        </span>
      </div>
      {totals.totalDiscount > 0 && (
        <div className="flex justify-between text-zinc-600">
          <span>{q.discountLabel || "Discount"}</span>
          <span>
            − {q.currency} {fmt(totals.totalDiscount)}
          </span>
        </div>
      )}
      {(q.additionalCharges ?? []).map((c, i) => (
        <div key={i} className="flex justify-between text-zinc-600">
          <span>{c.label}</span>
          <span>
            {q.currency} {fmt(c.amount)}
          </span>
        </div>
      ))}
      {variant === "highlight" ? (
        <div
          className="flex justify-between rounded px-3 py-2 text-base font-bold text-white"
          style={{ backgroundColor: themeColor }}
        >
          <span>Total ({q.currency})</span>
          <span>
            {q.currency} {fmt(totals.totalAmount)}
          </span>
        </div>
      ) : (
        <div
          className="flex justify-between border-t pt-2 text-base font-bold"
          style={{ borderColor: themeColor, color: themeColor }}
        >
          <span>Total ({q.currency})</span>
          <span>
            {q.currency} {fmt(totals.totalAmount)}
          </span>
        </div>
      )}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Total Qty</span>
        <span>{totals.totalQuantity}</span>
      </div>
    </>
  );

  return <div className="w-64 space-y-1.5 text-sm">{rows}</div>;
}
