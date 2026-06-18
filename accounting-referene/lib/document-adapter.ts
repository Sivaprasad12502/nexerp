import type { DocumentDetail } from "@/lib/hooks/use-documents";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationCreateInput } from "@/lib/validations/quotation";
import type { DocumentUpdateInput } from "@/lib/validations/document";
import {
  DOCUMENT_TYPE_LABEL,
  type DocumentTypeValue,
} from "@/lib/validations/document";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";

/** QuotationForm config for editing an existing document by type. */
export function getDocumentEditFormConfig(doc: Pick<DocumentDetail, "type">) {
  const type = doc.type as DocumentTypeValue;
  const typeLabel = DOCUMENT_TYPE_LABEL[type] ?? doc.type;
  const isPurchaseOrder = type === "PURCHASE_ORDER";

  return {
    updateEndpoint: (docId: string) => `/api/documents/${docId}`,
    invalidateKey: isPurchaseOrder ? "purchase-orders" : "documents",
    titleFallback: typeLabel,
    resourceLabel: typeLabel,
    responseKey: "document" as const,
    ...(isPurchaseOrder ? { partyType: "vendor" as const } : {}),
  };
}

/** Convert YYYY-MM-DD or ISO string to ISO datetime for document APIs. */
function toDocumentDateTime(dateStr: string | null | undefined): string | undefined {
  if (!dateStr || dateStr.trim() === "") return undefined;
  if (dateStr.includes("T")) return dateStr;
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

/** Map quotation form status to document status. */
export function mapFormStatusToDocumentStatus(
  status: string | undefined,
): "DRAFT" | "ISSUED" | "CANCELLED" | undefined {
  if (!status) return undefined;
  if (status === "SAVED" || status === "SENT" || status === "APPROVED") return "ISSUED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "ISSUED") return "ISSUED";
  if (status === "DRAFT") return "DRAFT";
  return undefined;
}

/**
 * QuotationForm sends quotation field names; document PATCH expects document field names.
 * Used when saving purchase orders, sales orders, invoices, etc. via /api/documents/[id].
 */
export function quotationFormToDocumentUpdate(
  data: QuotationCreateInput & { status?: string },
): DocumentUpdateInput {
  const validTill = data.validTillDate;
  const validTillIso =
    validTill && validTill !== "" ? toDocumentDateTime(validTill) ?? null : null;

  return {
    title: data.quotationTitle,
    documentNumber: data.quotationNumber,
    documentDate: toDocumentDateTime(data.quotationDate),
    validTillDate: validTillIso,
    subtitle: data.subtitle,
    logo: data.logo,
    currency: data.currency,
    fromName: data.fromName,
    fromAddress: data.fromAddress,
    fromGstin: data.fromGstin,
    fromPan: data.fromPan,
    clientName: data.clientName,
    clientAddress: data.clientAddress,
    clientGstin: data.clientGstin,
    discountLabel: data.discountLabel,
    discountAmount: data.discountAmount,
    additionalCharges: data.additionalCharges,
    termsAndConditions: data.termsAndConditions,
    notes: data.notes,
    signature: data.signature,
    additionalInfo: data.additionalInfo,
    contactDetails: data.contactDetails,
    attachments: data.attachments,
    customFields: data.customFields,
    settings: data.settings as Record<string, unknown> | undefined,
    items: data.items,
    status: mapFormStatusToDocumentStatus(data.status),
  };
}

/** True when the payload uses quotation form field names (quotationDate, etc.). */
export function isQuotationFormPayload(body: unknown): body is QuotationCreateInput {
  return (
    typeof body === "object" &&
    body !== null &&
    ("quotationDate" in body || "quotationNumber" in body || "quotationTitle" in body)
  );
}

/** Map a Document to the QuotationRow shape used by QuotationPreview / QuotationForm. */
export function adaptDocumentToQuotationRow(doc: DocumentDetail, titleFallback = "Document"): QuotationRow {
  return {
    id: doc.id,
    quotationTitle: doc.title ?? titleFallback,
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
