import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type { PaymentReceiptRow } from "@/lib/hooks/use-payment-receipts";

type Props = {
  receipt: PaymentReceiptRow;
  themeColor?: string;
};

export function SettledInvoicesTable({ receipt, themeColor = "#7438dc" }: Props) {
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
    const invoiceAmount = alloc.documentTotal ?? 0;
    const amountSettled = alloc.amountAllocated;
    const dueAmount = Math.max(0, invoiceAmount - amountSettled);
    const isPaid = dueAmount === 0;

    return {
      id: alloc.id,
      documentNumber: alloc.documentNumber ?? "—",
      currency,
      invoiceAmount,
      amountReceived: amountSettled,
      amountSettled,
      dueAmount,
      isPaid,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      invoiceAmount: acc.invoiceAmount + row.invoiceAmount,
      amountReceived: acc.amountReceived + row.amountReceived,
      amountSettled: acc.amountSettled + row.amountSettled,
      dueAmount: acc.dueAmount + row.dueAmount,
    }),
    { invoiceAmount: 0, amountReceived: 0, amountSettled: 0, dueAmount: 0 },
  );

  const totalCurrency = receipt.currency;

  return (
    <div className="mt-6 overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: themeColor }}>
            <th className="px-4 py-3 text-left text-xs font-semibold text-white first:rounded-tl-lg">
              Invoices #
            </th>
            <th className="border-l border-white/30 px-4 py-3 text-left text-xs font-semibold text-white">
              Invoice Amount
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
              <td className="px-4 py-3">{fmt(row.invoiceAmount, row.currency)}</td>
              <td className="px-4 py-3">{fmt(row.amountReceived, receipt.currency)}</td>
              <td className="px-4 py-3">{fmt(row.amountSettled, receipt.currency)}</td>
              <td className="px-4 py-3">{fmt(row.dueAmount, row.currency)}</td>
            </tr>
          ))}
          <tr className="font-bold text-zinc-900">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3">{fmt(totals.invoiceAmount, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.amountReceived, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.amountSettled, totalCurrency)}</td>
            <td className="px-4 py-3">{fmt(totals.dueAmount, totalCurrency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
