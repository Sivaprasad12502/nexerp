import type { DocumentDetail } from "@/lib/hooks/use-documents";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";

/** Map a Document to the QuotationRow shape used by QuotationPreview / QuotationForm. */
export function adaptDocumentToQuotationRow(doc: DocumentDetail): QuotationRow {
  return {
    id: doc.id,
    quotationTitle: doc.title ?? "Purchase Order",
    quotationNumber: doc.documentNumber,
    quotationDate: doc.documentDate,
    validTillDate: doc.validTillDate,
    subtitle: doc.subtitle,
    logo: doc.logo,
    currency: doc.currency,
    fromName: doc.fromName,
    fromAddress: doc.fromAddress,
    fromGstin: doc.fromGstin,
    fromPan: doc.fromPan,
    clientId: doc.clientId,
    clientName: doc.clientName,
    clientAddress: doc.clientAddress,
    clientGstin: doc.clientGstin,
    showShipping: false,
    shipFromWarehouseId: null,
    shippingName: null,
    shippingAddress: null,
    shippingPostalCode: null,
    shippingState: null,
    transporterName: null,
    distance: null,
    vehicleType: null,
    vehicleNumber: null,
    transportDocNumber: null,
    transactionType: null,
    discountLabel: doc.discountLabel,
    discountAmount: doc.discountAmount,
    additionalCharges: Array.isArray(doc.additionalCharges)
      ? (doc.additionalCharges as { label: string; amount: number }[])
      : [],
    subTotal: doc.subTotal,
    totalTax: doc.totalTax,
    totalDiscount: doc.totalDiscount,
    totalQuantity: doc.totalQuantity,
    totalAmount: doc.totalAmount,
    amountInWords: doc.amountInWords,
    termsAndConditions: doc.termsAndConditions,
    notes: doc.notes,
    signature: doc.signature,
    additionalInfo: doc.additionalInfo,
    contactDetails: doc.contactDetails,
    attachments: doc.attachments,
    customFields: Array.isArray(doc.customFields)
      ? (doc.customFields as { label: string; value: string }[])
      : [],
    settings: {
      ...DEFAULT_QUOTATION_SETTINGS,
      ...(typeof doc.settings === "object" && doc.settings !== null
        ? (doc.settings as Partial<QuotationSettings>)
        : {}),
    },
    status: "APPROVED",
    items: doc.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      hsnSac: item.hsnSac,
      unit: item.unit,
      description: item.description,
      image: item.image,
      groupName: item.groupName,
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      amount: item.amount,
      total: item.total,
      sortOrder: item.sortOrder,
    })),
  };
}

export function getVendorEmailFromDocument(doc: {
  settings: unknown;
  client?: { email: string | null } | null;
}): string | null {
  if (doc.client?.email) return doc.client.email;
  if (typeof doc.settings === "object" && doc.settings !== null) {
    const email = (doc.settings as { vendorEmail?: string }).vendorEmail;
    if (email) return email;
  }
  return null;
}

export function formatCurrency(amount: number, currency: string): string {
  const isInr =
    currency.includes("INR") ||
    currency.includes("₹") ||
    currency.toLowerCase().includes("rupee");
  const symbol = isInr ? "₹" : "";
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${formatted}` : `${currency} ${formatted}`;
}
