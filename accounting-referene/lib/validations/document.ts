import { z } from "zod";

export const DOCUMENT_TYPES = [
  "INVOICE",
  "PURCHASE_ORDER",
  "SALES_ORDER",
  "PROFORMA_INVOICE",
  "DELIVERY_CHALLAN",
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<DocumentTypeValue, string> = {
  INVOICE:          "Invoice",
  PURCHASE_ORDER:   "Purchase Order",
  SALES_ORDER:      "Sales Order",
  PROFORMA_INVOICE: "Proforma Invoice",
  DELIVERY_CHALLAN: "Delivery Challan",
};

export const DOCUMENT_TYPE_PREFIX: Record<DocumentTypeValue, string> = {
  INVOICE:          "INV",
  PURCHASE_ORDER:   "PO",
  SALES_ORDER:      "SO",
  PROFORMA_INVOICE: "PI",
  DELIVERY_CHALLAN: "DC",
};

export const documentConvertSchema = z.object({
  targetType: z.enum(DOCUMENT_TYPES, {
    error: "Invalid target document type",
  }),
});

export type DocumentConvertInput = z.infer<typeof documentConvertSchema>;

export const documentListQuerySchema = z.object({
  type: z.enum(DOCUMENT_TYPES).optional(),
});

export const documentSendSchema = z.object({
  to: z.string().trim().email("Valid vendor email is required"),
  cc: z.array(z.string().trim().email()).default([]),
  replyTo: z.string().trim().email().optional().or(z.literal("")),
  subject: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(10000),
  textType: z.enum(["rich", "plain"]).default("rich"),
  getEmailStatus: z.boolean().default(true),
});

export type DocumentSendInput = z.infer<typeof documentSendSchema>;

// Reuse quotation item shape for document updates
import { quotationItemSchema, additionalChargeSchema, customFieldSchema, quotationSettingsSchema } from "@/lib/validations/quotation";

export const documentUpdateSchema = z.object({
  title: z.string().trim().max(300).optional().or(z.literal("")),
  documentNumber: z.string().trim().min(1).max(80).optional(),
  documentDate: z.string().datetime().optional(),
  validTillDate: z.string().datetime().optional().nullable(),
  subtitle: z.string().trim().max(500).optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  currency: z.string().trim().max(50).optional(),
  fromName: z.string().trim().max(300).optional().or(z.literal("")),
  fromAddress: z.string().trim().max(2000).optional().or(z.literal("")),
  fromGstin: z.string().trim().max(50).optional().or(z.literal("")),
  fromPan: z.string().trim().max(50).optional().or(z.literal("")),
  clientName: z.string().trim().max(300).optional().or(z.literal("")),
  clientAddress: z.string().trim().max(2000).optional().or(z.literal("")),
  clientGstin: z.string().trim().max(50).optional().or(z.literal("")),
  discountLabel: z.string().trim().max(200).optional().or(z.literal("")),
  discountAmount: z.coerce.number().min(0).optional(),
  additionalCharges: z.array(additionalChargeSchema).optional(),
  termsAndConditions: z.string().trim().max(5000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  signature: z.string().optional().or(z.literal("")),
  additionalInfo: z.string().trim().max(5000).optional().or(z.literal("")),
  contactDetails: z.string().trim().max(1000).optional().or(z.literal("")),
  attachments: z.array(z.string()).optional(),
  customFields: z.array(customFieldSchema).optional(),
  settings: quotationSettingsSchema.optional(),
  items: z.array(quotationItemSchema).optional(),
  status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]).optional(),
});

export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
