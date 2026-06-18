import { z } from "zod";

const customFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const paymentAccountCreateSchema = z.object({
  type: z.enum(["BANK", "EMPLOYEE", "OTHER"]).default("BANK"),
  displayName: z.string().optional(),
  accountHolderName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  accountType: z.enum(["SAVINGS", "CURRENT"]).optional().nullable(),
  upiId: z.string().optional().nullable(),
  // Extended fields
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  swift: z.string().optional().nullable(),
  customFields: z.array(customFieldSchema).optional().nullable(),
  linkedBankAccountId: z.string().optional().nullable(),
});

export const paymentAccountUpdateSchema = z.object({
  displayName: z.string().optional(),
  accountHolderName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  accountType: z.enum(["SAVINGS", "CURRENT"]).optional().nullable(),
  upiId: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  swift: z.string().optional().nullable(),
  customFields: z.array(customFieldSchema).optional().nullable(),
  linkedBankAccountId: z.string().optional().nullable(),
});

export type PaymentAccountCreateInput = z.infer<typeof paymentAccountCreateSchema>;
export type PaymentAccountUpdateInput = z.infer<typeof paymentAccountUpdateSchema>;
