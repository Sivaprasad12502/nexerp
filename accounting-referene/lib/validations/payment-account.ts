import { z } from "zod";

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
});

export type PaymentAccountCreateInput = z.infer<typeof paymentAccountCreateSchema>;
