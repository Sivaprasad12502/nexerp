import { z } from "zod";

const optionalStr = (max = 200) => z.string().trim().max(max).optional().or(z.literal(""));

export const warehouseCreateSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(120),
  warehouseCode: optionalStr(80),
  vatNumber: optionalStr(80),

  country: optionalStr(),
  state: optionalStr(),
  city: optionalStr(),
  postalCode: optionalStr(20),
  streetAddress: optionalStr(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalStr(40),

  location: optionalStr(),
  contactInfo: optionalStr(),
  notes: optionalStr(500),
  isDefault: z.boolean().optional(),
  warehouseStatus: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
