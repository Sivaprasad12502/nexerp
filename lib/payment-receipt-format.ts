/** Client-safe payment receipt formatting helpers (no Prisma/Node imports). */

export type ReceiptFormatOptions = {
  currency: string;
  numberFormat?: string;
  decimalDigits?: number;
  customCurrencySymbol?: string | null;
};

export function formatReceiptAmount(
  amount: number,
  opts: ReceiptFormatOptions,
): string {
  const { currency, numberFormat = "en-IN", decimalDigits = 2, customCurrencySymbol } = opts;
  const minMax =
    decimalDigits === -1
      ? { minimumFractionDigits: 0, maximumFractionDigits: 4 }
      : { minimumFractionDigits: decimalDigits, maximumFractionDigits: decimalDigits };

  const formatted = amount.toLocaleString(numberFormat, minMax);

  if (customCurrencySymbol?.trim()) {
    return `${customCurrencySymbol}${formatted}`;
  }

  const isInr =
    currency.includes("INR") ||
    currency.includes("₹") ||
    currency.toLowerCase().includes("rupee");
  if (isInr) return `₹${formatted}`;
  return `${currency} ${formatted}`;
}

export function parseInvoicePaymentStatus(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return "UNPAID";
  const s = settings as { paymentStatus?: string };
  return s.paymentStatus ?? "UNPAID";
}
