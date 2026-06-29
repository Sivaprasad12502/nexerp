import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  type: z.enum(["INCOMING", "OUTGOING"]),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  rate: z.number().optional().nullable(),
  adjustedValue: z.number().optional().nullable(),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  reason: z.string().trim().min(1, "Reason is required").max(200),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
