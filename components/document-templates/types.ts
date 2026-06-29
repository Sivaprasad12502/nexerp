import type { QuotationSettings } from "@/lib/validations/quotation";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";

export type BusinessSettingsRow = {
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  bankSwift?: string | null;
  upiId?: string | null;
  upiQrUrl?: string | null;
  letterheadUrl?: string | null;
  footerText?: string | null;
  watermarkText?: string | null;
  watermarkUrl?: string | null;
};

export type QuotationTotals = {
  subTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalQuantity: number;
  totalAmount: number;
};

export type QuotationLayoutProps = {
  q: QuotationRow;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  documentLabel: string;
  totals: QuotationTotals;
  fmt: (n: number) => string;
};
