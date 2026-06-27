import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";

type ItemsTableProps = {
  q: QuotationRow;
  settings: QuotationSettings;
  themeColor: string;
  fmt: (n: number) => string;
  variant?: "standard" | "simple";
};

export function ItemsTable({
  q,
  settings,
  themeColor,
  fmt,
  variant = "standard",
}: ItemsTableProps) {
  const tableHeaderStyle = {
    backgroundColor: themeColor,
    color: "#fff",
  };

  const isSimple = variant === "simple";

  return (
    <>
      <table className="mb-0 w-full border-collapse text-xs">
        <thead>
          <tr style={tableHeaderStyle}>
            <th className="py-2 pl-3 pr-2 text-left font-semibold">
              {isSimple ? "Item" : "#. Item"}
            </th>
            {(isSimple || settings.showHsnSummary) && (
              <th className="px-2 py-2 text-left font-semibold">HSN/SAC</th>
            )}
            {!isSimple && settings.showSku && (
              <th className="px-2 py-2 text-left font-semibold">SKU</th>
            )}
            {!isSimple && (
              <th className="px-2 py-2 text-right font-semibold">Tax%</th>
            )}
            <th className="px-2 py-2 text-right font-semibold">Qty</th>
            {!isSimple &&
              settings.displayUnitAs !== "doNotShow" &&
              settings.displayUnitAs !== "mergeWithName" && (
                <th className="px-2 py-2 text-left font-semibold">Unit</th>
              )}
            <th className="px-2 py-2 text-right font-semibold">Rate</th>
            {isSimple && (
              <>
                <th className="px-2 py-2 text-right font-semibold">CGST</th>
                <th className="px-2 py-2 text-right font-semibold">SGST</th>
              </>
            )}
            <th className="px-2 py-2 text-right font-semibold">Amount</th>
            {!isSimple && (
              <>
                <th className="px-2 py-2 text-right font-semibold">TAX</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {q.items.map((item, i) => {
            if (item.groupName) {
              const colSpan = isSimple ? 7 : 9;
              return (
                <tr key={item.id} className="bg-zinc-50">
                  <td
                    colSpan={colSpan}
                    className="py-1.5 pl-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: themeColor }}
                  >
                    {item.groupName}
                  </td>
                </tr>
              );
            }
            const rowBg = i % 2 === 0 ? "#fff" : "#f9f9fb";
            const halfTax = item.taxAmount / 2;
            return (
              <tr key={item.id} style={{ backgroundColor: rowBg }}>
                <td className="py-2 pl-3 pr-2 align-top">
                  <div className="flex gap-2">
                    {settings.showThumbnails && item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-8 w-8 flex-shrink-0 rounded border border-zinc-200 object-cover"
                      />
                    )}
                    <div>
                      {!isSimple && <span className="mr-1 text-zinc-400">{i + 1}.</span>}
                      <span className="font-medium text-zinc-900">
                        {item.name}
                        {settings.displayUnitAs === "mergeWithName" && item.unit
                          ? ` (${item.unit})`
                          : ""}
                      </span>
                      {item.description && (
                        <p
                          className={`mt-0.5 text-zinc-500 ${
                            settings.showFullWidthDescription ? "col-span-full" : "text-xs"
                          }`}
                        >
                          {item.description}
                        </p>
                      )}
                      {!isSimple &&
                        !settings.showHsnSummary &&
                        item.hsnSac && (
                          <p className="text-[10px] text-zinc-400">HSN: {item.hsnSac}</p>
                        )}
                    </div>
                  </div>
                </td>
                {(isSimple || settings.showHsnSummary) && (
                  <td className="px-2 py-2 align-top text-zinc-600">{item.hsnSac ?? "—"}</td>
                )}
                {!isSimple && settings.showSku && (
                  <td className="px-2 py-2 align-top text-zinc-600">{item.sku ?? "—"}</td>
                )}
                {!isSimple && (
                  <td className="px-2 py-2 text-right align-top text-zinc-600">
                    {item.taxRate ?? 0}%
                  </td>
                )}
                <td className="px-2 py-2 text-right align-top font-medium text-zinc-700">
                  {settings.displayUnitAs === "mergeWithQuantity" && item.unit
                    ? `${item.quantity} ${item.unit}`
                    : item.quantity}
                </td>
                {!isSimple &&
                  settings.displayUnitAs !== "doNotShow" &&
                  settings.displayUnitAs !== "mergeWithName" && (
                    <td className="px-2 py-2 align-top text-zinc-600">{item.unit ?? ""}</td>
                  )}
                <td className="px-2 py-2 text-right align-top text-zinc-700">
                  {q.currency} {fmt(item.rate)}
                </td>
                {isSimple && (
                  <>
                    <td className="px-2 py-2 text-right align-top text-zinc-700">
                      {fmt(halfTax)}
                    </td>
                    <td className="px-2 py-2 text-right align-top text-zinc-700">
                      {fmt(halfTax)}
                    </td>
                  </>
                )}
                <td className="px-2 py-2 text-right align-top text-zinc-700">
                  {fmt(item.amount)}
                </td>
                {!isSimple && (
                  <>
                    <td className="px-2 py-2 text-right align-top text-zinc-700">
                      {fmt(item.taxAmount)}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-semibold text-zinc-900">
                      {fmt(item.total)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {settings.showHsnSummary && (
        <HsnSummaryTable q={q} fmt={fmt} />
      )}

      {settings.showTaxSummary && (
        <TaxSummaryTable q={q} fmt={fmt} />
      )}
    </>
  );
}

function HsnSummaryTable({
  q,
  fmt,
}: {
  q: QuotationRow;
  fmt: (n: number) => string;
}) {
  return (
    <div className="mb-4 mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        HSN / SAC Summary
      </p>
      <table className="w-full border border-zinc-200 text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium text-zinc-600">HSN/SAC</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Taxable Amt</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax%</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax Amt</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(
            q.items.reduce<Record<string, { taxable: number; tax: number; rate: number }>>(
              (acc, item) => {
                if (!item.hsnSac || item.groupName) return acc;
                acc[item.hsnSac] = acc[item.hsnSac] ?? {
                  taxable: 0,
                  tax: 0,
                  rate: item.taxRate,
                };
                acc[item.hsnSac].taxable += item.amount;
                acc[item.hsnSac].tax += item.taxAmount;
                return acc;
              },
              {},
            ),
          ).map(([hsn, v]) => (
            <tr key={hsn} className="border-t border-zinc-200">
              <td className="px-3 py-1.5">{hsn}</td>
              <td className="px-3 py-1.5 text-right">{fmt(v.taxable)}</td>
              <td className="px-3 py-1.5 text-right">{v.rate}%</td>
              <td className="px-3 py-1.5 text-right">{fmt(v.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaxSummaryTable({
  q,
  fmt,
}: {
  q: QuotationRow;
  fmt: (n: number) => string;
}) {
  return (
    <div className="mb-4 mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tax Summary
      </p>
      <table className="w-full border border-zinc-200 text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium text-zinc-600">Tax Rate</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Taxable Amount</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(
            q.items.reduce<Record<string, { taxable: number; tax: number }>>((acc, item) => {
              if (item.groupName) return acc;
              const k = `${item.taxRate}%`;
              acc[k] = acc[k] ?? { taxable: 0, tax: 0 };
              acc[k].taxable += item.amount;
              acc[k].tax += item.taxAmount;
              return acc;
            }, {}),
          ).map(([rate, v]) => (
            <tr key={rate} className="border-t border-zinc-200">
              <td className="px-3 py-1.5">{rate}</td>
              <td className="px-3 py-1.5 text-right">{fmt(v.taxable)}</td>
              <td className="px-3 py-1.5 text-right">{fmt(v.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
