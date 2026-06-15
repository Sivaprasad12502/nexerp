import { z } from "zod";

const optionalStr = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const numField = z.coerce.number().min(0).default(0);

// ─── Line Item ────────────────────────────────────────────────────────────────

export const quotationItemSchema = z.object({
  id: z.string().optional(), // present when editing
  productId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Item name is required").max(300),
  sku: optionalStr(80),
  hsnSac: optionalStr(40),
  unit: optionalStr(40),
  description: optionalStr(1000),
  image: z.url().optional().or(z.literal("")).or(z.undefined()),
  groupName: optionalStr(200),
  quantity: numField,
  rate: numField,
  discount: numField,
  taxRate: numField,
  taxAmount: numField,
  amount: numField,
  total: numField,
  sortOrder: z.number().int().default(0),
});

export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

// ─── Additional Charge ────────────────────────────────────────────────────────

export const additionalChargeSchema = z.object({
  label: z.string().trim().max(200).default(""),
  amount: numField,
});

export type AdditionalChargeInput = z.infer<typeof additionalChargeSchema>;

// ─── Custom Field ─────────────────────────────────────────────────────────────

export const customFieldSchema = z.object({
  label: z.string().trim().max(200).default(""),
  value: z.string().trim().max(500).default(""),
});

// ─── Advanced Settings ────────────────────────────────────────────────────────

export const quotationSettingsSchema = z.object({
  // ── Existing display toggles ──
  displayUnitAs: z.enum(["mergeWithQuantity", "mergeWithName", "doNotShow"]).default("mergeWithQuantity"),
  showTaxSummary: z.boolean().default(false),
  hideCountryOfSupply: z.boolean().default(false),
  addOriginalImages: z.boolean().default(false),
  showThumbnails: z.boolean().default(false),
  showFullWidthDescription: z.boolean().default(false),
  hideSubtotalForGroups: z.boolean().default(false),
  showSku: z.boolean().default(false),
  showSerialNumbers: z.boolean().default(false),
  showBatchDetails: z.boolean().default(false),
  showHsnSummary: z.boolean().default(false),

  // ── Design / Template ──
  template: z.enum(["professional", "modern", "simple", "classic"]).default("professional"),
  themeColor: z.string().default("#7438dc"),
  fontFamily: z.enum(["inter", "serif", "sans", "mono"]).default("inter"),

  // ── PDF configuration ──
  pageSize: z.enum(["A4", "Letter", "Legal", "A5"]).default("A4"),
  margin: z.enum(["normal", "narrow", "wide"]).default("normal"),

  // ── Script / number format ──
  numberFormat: z.string().default("en-IN"),

  // ── Optional document blocks (shared data from BusinessSettings) ──
  showLetterhead:   z.boolean().default(false),
  showFooter:       z.boolean().default(false),
  showWatermark:    z.boolean().default(false),
  watermarkOpacity: z.number().min(0.05).max(1).default(0.15),
  showBankDetails:  z.boolean().default(false),
  showUpiDetails:   z.boolean().default(false),
  showBatchSummary: z.boolean().default(false),
}).default({
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
});

export type QuotationSettings = z.infer<typeof quotationSettingsSchema>;

// ─── Main Quotation Schema ────────────────────────────────────────────────────

export const quotationCreateSchema = z.object({
  // Header
  quotationTitle: optionalStr(200),
  quotationNumber: optionalStr(80),
  quotationDate: z.string().optional().or(z.literal("")),
  validTillDate: z.string().optional().or(z.literal("")).or(z.null()),
  subtitle: optionalStr(300),
  logo: z.url().optional().or(z.literal("")).or(z.undefined()),
  currency: z.string().trim().max(80).default("AED"),

  // Quotation From
  fromName: optionalStr(200),
  fromAddress: optionalStr(500),
  fromGstin: optionalStr(80),
  fromPan: optionalStr(80),

  // Quotation For
  clientId: z.string().optional().or(z.literal("")).or(z.null()),
  clientName: optionalStr(200),
  clientAddress: optionalStr(500),
  clientGstin: optionalStr(80),

  // Shipping & transport
  showShipping: z.boolean().default(false),
  shipFromWarehouseId: z.string().optional().or(z.literal("")).or(z.null()),
  shippingName: optionalStr(200),
  shippingAddress: optionalStr(500),
  shippingPostalCode: optionalStr(20),
  shippingState: optionalStr(80),
  transporterName: optionalStr(200),
  distance: optionalStr(80),
  vehicleType: optionalStr(80),
  vehicleNumber: optionalStr(80),
  transportDocNumber: optionalStr(80),
  transactionType: optionalStr(80),

  // Items
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),

  // Quotation-level discount & additional charges
  discountLabel: optionalStr(200),
  discountAmount: numField,
  additionalCharges: z.array(additionalChargeSchema).default([]),

  // Extras
  termsAndConditions: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  signature: z.url().optional().or(z.literal("")).or(z.undefined()),
  additionalInfo: z.string().trim().max(5000).optional().or(z.literal("")),
  contactDetails: z.string().trim().max(1000).optional().or(z.literal("")),
  attachments: z.array(z.string()).default([]),
  customFields: z.array(customFieldSchema).default([]),

  // Settings
  settings: quotationSettingsSchema.optional(),

  // Status
  status: z.enum(["DRAFT", "SAVED", "SENT", "VIEWED", "APPROVED", "REJECTED", "CANCELLED", "PURCHASE_ORDER_CREATED"]).default("DRAFT"),
});

export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;

export const quotationUpdateSchema = quotationCreateSchema.partial();
export type QuotationUpdateInput = z.infer<typeof quotationUpdateSchema>;

// ─── Send Quotation ───────────────────────────────────────────────────────────

export const quotationSendSchema = z.object({
  to:             z.string().trim().email("Valid client email is required"),
  cc:             z.array(z.string().trim().email()).default([]),
  replyTo:        z.string().trim().email().optional().or(z.literal("")),
  subject:        z.string().trim().min(1).max(500),
  message:        z.string().trim().min(1).max(10000),
  textType:       z.enum(["rich", "plain"]).default("rich"),
  getEmailStatus: z.boolean().default(true),
});

export type QuotationSendInput = z.infer<typeof quotationSendSchema>;

// ─── Reject Quotation ─────────────────────────────────────────────────────────

export const quotationRejectSchema = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required").max(2000),
});

export type QuotationRejectInput = z.infer<typeof quotationRejectSchema>;
