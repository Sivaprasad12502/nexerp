import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type { PayoutReceiptRow } from "@/lib/hooks/use-payout-receipts";

type Props = {
  receipt: PayoutReceiptRow;
  themeColor?: string;
};

export function SettledExpendituresTable({ receipt, themeColor = "#7438dc" }: Props) {
  if (receipt.allocations.length === 0) return null;

  const formatOpts = {
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
  };

  const fmt = (amount: number, currency: string) =>
    formatReceiptAmount(amount, { ...formatOpts, currency });

  const rows = receipt.allocations.map((alloc) => {
    const currency = alloc.documentCurrency ?? receipt.currency;
    const expenditureAmount = alloc.documentTotal ?? 0;
    const amountSettled = alloc.amountAllocated;
    const dueAmount = Math.max(0, expenditureAmount - amountSettled);
    const isPaid = dueAmount === 0;

    return {
      id: alloc.id,
      documentNumber: alloc.documentNumber ?? "—",
      currency,
      expenditureAmount,
      amountReceived: amountSettled,
      amountSettled,
      dueAmount,
      isPaid,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      expenditureAmount: acc.expenditureAmount + row.expenditureAmount,
      amountReceived: acc.amountReceived + row.amountReceived,
      amountSettled: acc.amountSettled + row.amountSettled,
      dueAmount: acc.dueAmount + row.dueAmount,
    }),
    { expenditureAmount: 0, amountReceived: 0, amountSettled: 0, dueAmount: 0 },
  );

  const totalCurrency = receipt.currency;

  return (
    <div className="mt-6 overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: themeColor }}>
            <th className="px-4 py-3 text-left text-xs font-semibold text-white first:rounded-tl-lg">
              Expenditures #
            </th>
            <th className="border-l border-white/30 px-4 py-3 text-left text-xs font-semibold text-white">
              Expenditure Amount
            </th>
            <th className="border-l border-white/30 px-4 py-3 text-left text-xs font-semibold text-white">
              Amount Received
            </th>
            <th className="border-l border-white/30 px-4 py-3 text-left text-xs font-semibold text-white">
              Amount Settled
            </th>
            <th className="border-l border-white/30 px-4 py-3 text-left text-xs font-semibold text-white last:rounded-tr-lg">
              Due Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 text-zinc-800">
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <span className="font-medium">{row.documentNumber}</span>
                  {row.isPaid && (
                    <span className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Paid
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3">{fmt(row.expenditureAmount, row.currency)}</td>
              <td className="px-4 py-3">{fmt(row.amountReceived, receipt.currency)}</td>
              <td className="px-4 py-3">{fmt(row.amountSettled, receipt.currency)}</td>
              <td className="px-4 py-3">{fmt(row.dueAmount, row.currency)}</td>
            </tr>
          ))}
          <tr className="font-bold text-zinc-900">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3">{fmt(totals.expenditureAmount, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.amountReceived, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.amountSettled, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.dueAmount, totalCurrency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
