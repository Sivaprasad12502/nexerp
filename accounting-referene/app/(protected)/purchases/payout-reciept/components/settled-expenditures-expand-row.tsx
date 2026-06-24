import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type { PayoutReceiptRow } from "@/lib/hooks/use-payout-receipts";

type Props = {
  receipt: PayoutReceiptRow;
  colSpan: number;
};

export function SettledExpendituresExpandRow({ receipt, colSpan }: Props) {
  const formatOpts = {
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
  };

  const fmt = (amount: number, currency: string) =>
    formatReceiptAmount(amount, { ...formatOpts, currency });

  if (receipt.allocations.length === 0) {
    return (
      <tr className="bg-zinc-50/50">
        <td colSpan={colSpan} className="px-8 py-4 text-center text-sm text-zinc-500">
          No settled expenditures against this receipt
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-zinc-50/50">
      <td colSpan={colSpan} className="px-8 py-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-100/80 text-xs font-semibold text-zinc-700">
              <th className="px-4 py-2.5 text-left">Expenditure Number</th>
              <th className="px-4 py-2.5 text-right">Expenditure Amount</th>
              <th className="px-4 py-2.5 text-right">Amount Settled</th>
              <th className="px-4 py-2.5 text-right">TDS Withheld</th>
              <th className="px-4 py-2.5 text-right">Transaction Charges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {receipt.allocations.map((alloc) => {
              const currency = alloc.documentCurrency ?? receipt.currency;
              return (
                <tr key={alloc.id} className="bg-white text-zinc-800">
                  <td className="px-4 py-2.5 font-medium">
                    {alloc.documentNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {fmt(alloc.documentTotal ?? 0, currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {fmt(alloc.amountAllocated, receipt.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {fmt(alloc.tdsWithheld, receipt.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {fmt(alloc.transactionCharge, receipt.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </td>
    </tr>
  );
}
