import type { PayoutReceiptRow } from "@/lib/payout-receipt-mapper";

export type PayoutReceiptPreviewData = {
  receiptNumber: string;
  receiptDate: string;
  status: string;
  type: string;
  currency: string;
  totalAmount: number;
  totalAllocated: number;
  paymentSurplus: number;
  issuedByName: string | null;
  issuedByCountry: string | null;
  paidToName: string | null;
  paidToCountry: string | null;
  lines: {
    method: string;
    methodLabel: string;
    amountReceived: number;
    paymentAccountName: string | null;
  }[];
  notes: string | null;
  signature: string | null;
  additionalInfo: string | null;
  contactDetails: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  ACCOUNT_TRANSFER: "Account Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export function adaptPayoutReceiptForPreview(
  receipt: PayoutReceiptRow,
): PayoutReceiptPreviewData {
  const totalAllocated = receipt.allocations.reduce((s, a) => s + a.amountAllocated, 0);

  return {
    receiptNumber: receipt.receiptNumber,
    receiptDate: receipt.receiptDate,
    status: receipt.displayStatus ?? receipt.status,
    type: receipt.type,
    currency: receipt.currency,
    totalAmount: receipt.totalAmount,
    totalAllocated,
    paymentSurplus: Math.max(0, receipt.totalAmount - totalAllocated),
    issuedByName: receipt.businessName,
    issuedByCountry: receipt.businessCountry,
    paidToName: receipt.vendorName,
    paidToCountry: receipt.vendorCountry,
    lines: receipt.lines.map((line) => ({
      method: line.method,
      methodLabel: METHOD_LABELS[line.method] ?? line.method.replace(/_/g, " "),
      amountReceived: line.amountReceived,
      paymentAccountName: line.paymentAccountName,
    })),
    notes: receipt.notes,
    signature: receipt.signature,
    additionalInfo: receipt.additionalInfo,
    contactDetails: receipt.contactDetails,
  };
}

export function payoutReceiptStatusBadge(status: string, type: string): string {
  if (status === "DRAFT") return "Draft";
  if (status === "SETTLED") return "Settled";
  if (status === "ADVANCE" || type === "VENDOR_ADVANCE") return "Advance";
  return status;
}
