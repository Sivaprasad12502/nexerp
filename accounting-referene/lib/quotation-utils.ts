// ─── Quotation Calculation Utilities ─────────────────────────────────────────

export interface ItemCalcInput {
  quantity: number;
  rate: number;
  discount: number; // flat amount
  taxRate: number;  // percent (e.g. 5 = 5%)
}

export interface ItemCalcResult {
  amount: number;   // qty * rate - discount (pre-tax base)
  taxAmount: number;
  total: number;    // amount + taxAmount
}

/** Compute derived values for one line item. */
export function calcItem(row: ItemCalcInput): ItemCalcResult {
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  const disc = Number(row.discount) || 0;
  const taxRate = Number(row.taxRate) || 0;

  const amount = Math.max(0, qty * rate - disc);
  const taxAmount = amount * (taxRate / 100);
  const total = amount + taxAmount;

  return {
    amount: round2(amount),
    taxAmount: round2(taxAmount),
    total: round2(total),
  };
}

export interface TotalsInput {
  items: ItemCalcInput[];
  discountAmount?: number;       // quotation-level discount (flat)
  additionalCharges?: number;    // total additional charges
}

export interface TotalsResult {
  subTotal: number;      // sum of all item amounts (pre-tax)
  totalTax: number;      // sum of all item taxAmounts
  totalDiscount: number; // sum of item discounts + quotation-level discount
  totalQuantity: number;
  totalAmount: number;   // subTotal - quotationDiscount + totalTax + additionalCharges
}

/** Compute quotation-level totals from items. */
export function calcTotals(input: TotalsInput): TotalsResult {
  const { items, discountAmount = 0, additionalCharges = 0 } = input;

  let subTotal = 0;
  let totalTax = 0;
  let itemDiscounts = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const r = calcItem(item);
    const disc = Number(item.discount) || 0;
    subTotal += r.amount + disc; // raw subtotal before per-item discount
    itemDiscounts += disc;
    totalTax += r.taxAmount;
    totalQuantity += Number(item.quantity) || 0;
  }

  const totalDiscount = round2(itemDiscounts + (Number(discountAmount) || 0));
  const taxedBase = round2(subTotal - itemDiscounts - (Number(discountAmount) || 0));
  const totalAmount = round2(taxedBase + totalTax + (Number(additionalCharges) || 0));

  return {
    subTotal: round2(subTotal - itemDiscounts), // net subtotal after per-item discounts
    totalTax: round2(totalTax),
    totalDiscount,
    totalQuantity: round2(totalQuantity),
    totalAmount,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Amount in Words ──────────────────────────────────────────────────────────

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty",
  "Sixty", "Seventy", "Eighty", "Ninety",
];

function inWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + inWords(-n);

  const chunks: string[] = [];

  if (n >= 1_00_00_000) {
    chunks.push(inWords(Math.floor(n / 1_00_00_000)) + " Crore");
    n %= 1_00_00_000;
  }
  if (n >= 1_00_000) {
    chunks.push(inWords(Math.floor(n / 1_00_000)) + " Lakh");
    n %= 1_00_000;
  }
  if (n >= 1000) {
    chunks.push(inWords(Math.floor(n / 1000)) + " Thousand");
    n %= 1000;
  }
  if (n >= 100) {
    chunks.push(ones[Math.floor(n / 100)] + " Hundred");
    n %= 100;
  }
  if (n >= 20) {
    chunks.push(tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : ""));
    n = 0;
  } else if (n > 0) {
    chunks.push(ones[n]);
  }

  return chunks.join(" ");
}

/**
 * Convert a monetary amount to an "Amount in Words" string.
 * e.g. numberToWords(1234.56, "AED") → "One Thousand Two Hundred Thirty Four AED and Fifty Six Fils Only"
 */
export function numberToWords(amount: number, currency = "AED"): string {
  if (isNaN(amount) || amount < 0) return "";
  const rounded = Math.round(amount * 100) / 100;
  const main = Math.floor(rounded);
  const frac = Math.round((rounded - main) * 100);

  // Determine sub-unit labels by currency
  const sub =
    currency.includes("INR") || currency.includes("₹") ? "Paise" :
    currency.includes("AED") ? "Fils" :
    currency.includes("USD") || currency.includes("$") ? "Cents" :
    currency.includes("EUR") || currency.includes("€") ? "Cents" :
    "Cents";

  // Strip symbol characters for display
  const currLabel = currency.replace(/[()₹$€£]/g, "").trim().split(" ")[0];

  let result = inWords(main) + " " + currLabel;
  if (frac > 0) {
    result += " and " + inWords(frac) + " " + sub;
  }
  return result + " Only";
}
