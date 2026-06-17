import { z } from "zod";

export const paymentCreateSchema = z.object({
  amountReceived: z.number().min(0),
  paymentDate: z.string().min(1),
  method: z
    .enum(["ACCOUNT_TRANSFER", "CASH", "CHEQUE", "UPI", "CARD", "OTHER"])
    .default("ACCOUNT_TRANSFER"),
  refId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachments: z.array(z.string()).default([]),
  recordedByName: z.string().optional().nullable(),
});

export const paymentApproveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  transactionCharge: z.number().min(0).default(0),
  tdsWithheld: z.number().min(0).default(0),
  paymentAccountId: z.string().optional().nullable(),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentApproveInput = z.infer<typeof paymentApproveSchema>;
