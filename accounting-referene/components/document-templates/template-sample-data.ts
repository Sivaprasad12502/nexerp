import { calcTotals } from "@/lib/quotation-utils";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow, QuotationTotals } from "./types";
import type { DocumentTemplateId } from "@/lib/document-templates";

const SAMPLE_ITEMS = [
  {
    id: "sample-1",
    productId: null,
    name: "Web Design",
    sku: null,
    hsnSac: "998314",
    unit: "nos",
    description: null,
    image: null,
    groupName: null,
    quantity: 1,
    rate: 25000,
    discount: 0,
    taxRate: 18,
    taxAmount: 4500,
    amount: 25000,
    total: 29500,
    sortOrder: 0,
  },
  {
    id: "sample-2",
    productId: null,
    name: "Hosting",
    sku: null,
    hsnSac: "998315",
    unit: "mo",
    description: null,
    image: null,
    groupName: null,
    quantity: 12,
    rate: 500,
    discount: 0,
    taxRate: 18,
    taxAmount: 1080,
    amount: 6000,
    total: 7080,
    sortOrder: 1,
  },
];

export function buildTemplateSampleQuotation(documentLabel: string): QuotationRow {
  return {
    id: "template-sample",
    quotationTitle: documentLabel,
    quotationNumber: "INV-0001",
    quotationDate: "2026-06-27",
    validTillDate: "2026-07-27",
    subtitle: null,
    logo: null,
    currency: "INR",
    fromName: "Studio Den Pvt Ltd",
    fromAddress: "Mumbai, Maharashtra",
    fromGstin: "27AABCU9603R1ZM",
    fromPan: "AABCU9603R",
    clientId: null,
    clientName: "Acme Corp",
    clientAddress: "Delhi, India",
    clientGstin: "07AABCA1234A1Z5",
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
    discountLabel: null,
    discountAmount: 0,
    additionalCharges: [],
    subTotal: 31000,
    totalTax: 5580,
    totalDiscount: 0,
    totalQuantity: 13,
    totalAmount: 36580,
    amountInWords: null,
    termsAndConditions: null,
    notes: null,
    signature: null,
    additionalInfo: null,
    contactDetails: null,
    attachments: [],
    customFields: [],
    settings: {} as QuotationSettings,
    status: "DRAFT",
    items: SAMPLE_ITEMS,
  };
}

export const TEMPLATE_SAMPLE_BUSINESS: BusinessSettingsRow = {};

export function buildTemplatePreviewProps(
  templateId: DocumentTemplateId,
  settings: QuotationSettings,
  documentLabel: string,
) {
  const q = buildTemplateSampleQuotation(documentLabel);
  const previewSettings: QuotationSettings = {
    ...settings,
    template: templateId,
    showLetterhead: false,
    showWatermark: false,
    showFooter: false,
    showBankDetails: false,
    showUpiDetails: false,
    margin: "narrow",
  };

  const totals: QuotationTotals = calcTotals({
    items: q.items.map((i) => ({
      quantity: i.quantity,
      rate: i.rate,
      discount: i.discount,
      taxRate: i.taxRate,
    })),
    discountAmount: q.discountAmount,
    additionalCharges: 0,
  });

  const fmt = (n: number) =>
    n.toLocaleString(previewSettings.numberFormat || "en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return {
    q,
    settings: previewSettings,
    bs: TEMPLATE_SAMPLE_BUSINESS,
    themeColor: settings.themeColor || "#7438dc",
    documentLabel,
    totals,
    fmt,
  };
}
