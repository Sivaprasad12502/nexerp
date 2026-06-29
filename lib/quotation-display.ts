/**
 * Shared display helpers for quotation workflow copy (notifications, emails).
 */

type QuotationLike = {
  quotationNumber?: string | null;
  clientName?: string | null;
  client?: { businessName?: string | null } | null;
};

export function getQuotationLabel(quotation: QuotationLike): string {
  return quotation.quotationNumber ?? "quotation";
}

export function getClientDisplayName(quotation: QuotationLike): string {
  return (
    quotation.clientName?.trim() ||
    quotation.client?.businessName?.trim() ||
    "A client"
  );
}
