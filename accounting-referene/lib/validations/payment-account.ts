import { z } from "zod";

const customFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const baseFields = {
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
  department: z.string().optional().nullable(),
  ledgerName: z.string().optional().nullable(),
  customFields: z.array(customFieldSchema).optional().nullable(),
  linkedBankAccountId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
};

export const paymentAccountCreateSchema = z
  .object({
    type: z.enum(["BANK", "EMPLOYEE", "OTHER"]).default("BANK"),
    ...baseFields,
  })
  .superRefine((data, ctx) => {
    if (data.type === "EMPLOYEE") {
      if (!data.accountHolderName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Employee name is required",
          path: ["accountHolderName"],
        });
      }
      if (!data.country?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required",
          path: ["country"],
        });
      }
      if (!data.currency?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Currency is required",
          path: ["currency"],
        });
      }
    }
    if (data.type === "OTHER" && !data.displayName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account name is required",
        path: ["displayName"],
      });
    }
  });

export const paymentAccountUpdateSchema = z.object(baseFields);

export type PaymentAccountCreateInput = z.infer<typeof paymentAccountCreateSchema>;
export type PaymentAccountUpdateInput = z.infer<typeof paymentAccountUpdateSchema>;

/** Derive display name from account payload. */
export function derivePaymentAccountDisplayName(
  data: {
    type?: string;
    displayName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
  },
  fallback?: string,
): string {
  if (data.displayName?.trim()) return data.displayName.trim();

  if (data.type === "EMPLOYEE") {
    return data.accountHolderName?.trim() || "Employee Account";
  }

  if (data.type === "OTHER") {
    return "Other Account";
  }

  if (data.bankName && data.accountNumber) {
    return `${data.bankName} ****${data.accountNumber.slice(-4)}`;
  }

  return data.bankName || data.accountHolderName || fallback || "Bank Account";
}
