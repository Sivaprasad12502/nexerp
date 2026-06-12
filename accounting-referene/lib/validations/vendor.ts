import { z } from "zod";

const optionalStr = (max = 80) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const vendorCreateSchema = z.object({
  name:      z.string().trim().min(1, "Vendor name is required").max(200),
  email:     z.email().optional().or(z.literal("")),
  phone:     optionalStr(30),
  website:   z.url().optional().or(z.literal("")),
  address:   optionalStr(500),
  gstNumber: optionalStr(50),
});

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
