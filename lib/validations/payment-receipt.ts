import { z } from "zod";

import { quotationSettingsSchema } from "@/lib/validations/quotation";

export const NUMBER_FORMAT_OPTIONS = [
  { value: "en-IN", label: "India - English (Lakhs)", example: "₹1,23,45,679" },
  { value: "en-US", label: "United States - English (Millions)", example: "₹12,345,679" },
  { value: "ar-AE", label: "UAE - Arabic", example: "١٢٬٣٤٥٬٦٧٩" },
  { value: "de-DE", label: "Germany - European", example: "12.345.679" },
] as const;

export const DECIMAL_DIGIT_OPTIONS = [
  { value: -1, label: "Default", example: "99.00" },
  { value: 0, label: "99", example: "99" },
  { value: 1, label: "99.0", example: "99.0" },
  { value: 2, label: "99.00", example: "99.00" },
  { value: 3, label: "99.000", example: "99.000" },
  { value: 4, label: "99.0000", example: "99.0000" },
] as const;

export const paymentReceiptLineSchema = z.object({
  paymentAccountId: z.string().optional().nullable(),
  method: z
    .enum(["ACCOUNT_TRANSFER", "CASH", "CHEQUE", "UPI", "CARD", "OTHER"])
    .default("ACCOUNT_TRANSFER"),
  refId: z.string().optional().nullable(),
  amountReceived: z.number().min(0.01, "Amount must be greater than 0"),
  amountInBaseCurrency: z.number().min(0).optional().nullable(),
  transactionCharge: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

export const paymentReceiptAllocationSchema = z.object({
  documentId: z.string().min(1),
  amountAllocated: z.number().min(0.01),
});

export const paymentReceiptCreateSchema = z.object({
  receiptNumber: z.string().trim().min(1).max(50).optional(),
  type: z.enum(["PAYMENT_RECEIPT", "CLIENT_ADVANCE"]).default("PAYMENT_RECEIPT"),
  clientId: z.string().min(1, "Client is required"),
  receiptDate: z.string().min(1),
  currency: z.string().trim().min(1).default("INR"),
  numberFormat: z.string().default("en-IN"),
  decimalDigits: z.number().int().min(-1).max(4).default(2),
  customCurrencySymbol: z.string().optional().nullable(),
  lines: z.array(paymentReceiptLineSchema).min(1, "Add at least one payment record"),
  allocations: z.array(paymentReceiptAllocationSchema).default([]),
  settlementDocumentType: z.enum(["INVOICE", "PROFORMA_INVOICE"]).default("INVOICE"),
  notes: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
  additionalInfo: z.string().optional().nullable(),
  contactDetails: z.string().optional().nullable(),
  attachments: z.array(z.string()).default([]),
  saveAsDraft: z.boolean().optional().default(false),
  settings: quotationSettingsSchema.optional(),
});

export const paymentReceiptSendSchema = z.object({
  to: z.string().trim().email("Valid email is required"),
  cc: z.array(z.string().trim().email()).default([]),
  replyTo: z.string().trim().email().optional().or(z.literal("")),
  subject: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(10000),
  textType: z.enum(["rich", "plain"]).default("rich"),
  getEmailStatus: z.boolean().default(true),
});

export const paymentReceiptUpdateSchema = paymentReceiptCreateSchema.partial();

export type PaymentReceiptLineInput = z.infer<typeof paymentReceiptLineSchema>;
export type PaymentReceiptAllocationInput = z.infer<typeof paymentReceiptAllocationSchema>;
export type PaymentReceiptCreateInput = z.infer<typeof paymentReceiptCreateSchema>;
export type PaymentReceiptUpdateInput = z.infer<typeof paymentReceiptUpdateSchema>;
export type PaymentReceiptSendInput = z.infer<typeof paymentReceiptSendSchema>;
