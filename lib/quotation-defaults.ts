import type { QuotationSettings } from "@/lib/validations/quotation";

/** Default settings applied to quotations that have no settings yet. */
export const DEFAULT_QUOTATION_SETTINGS: QuotationSettings = {
  displayUnitAs: "mergeWithQuantity",
  showTaxSummary: false,
  hideCountryOfSupply: false,
  addOriginalImages: false,
  showThumbnails: false,
  showFullWidthDescription: false,
  hideSubtotalForGroups: false,
  showSku: false,
  showSerialNumbers: false,
  showBatchDetails: false,
  showHsnSummary: false,
  template: "professional",
  themeColor: "#7438dc",
  fontFamily: "inter",
  pageSize: "A4",
  margin: "normal",
  numberFormat: "en-IN",
  showLetterhead: false,
  showFooter: false,
  showWatermark: false,
  watermarkOpacity: 0.15,
  showBankDetails: false,
  showUpiDetails: false,
  showBatchSummary: false,
};
