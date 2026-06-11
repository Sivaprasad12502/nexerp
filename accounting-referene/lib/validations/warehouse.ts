import { z } from "zod";

const optionalStr = (max = 80) => z.string().trim().max(max).optional().or(z.literal(""));

export const warehouseCreateSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(120),
  location: optionalStr(200),
  contactInfo: optionalStr(200),
  notes: optionalStr(500),
  isDefault: z.boolean().optional(),
  warehouseStatus: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  vatNumber: optionalStr(80),
});

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
