import { z } from "zod";

const optionalStr = (max = 80) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email()
  .optional()
  .or(z.literal(""));

export const vendorCreateSchema = z.object({
  // Basic
  name:         z.string().trim().min(1, "Vendor name is required").max(200),
  logo:         z.string().url().optional().or(z.literal("")),
  industry:     optionalStr(80),
  country:      optionalStr(80),
  city:         optionalStr(80),
  vendorType:   z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  website:      z.string().url().optional().or(z.literal("")),

  // Contact
  email:        optionalEmail,
  phoneCode:    optionalStr(10),
  phone:        optionalStr(30),
  showEmailInDocs:  z.boolean().optional(),
  showPhoneInDocs:  z.boolean().optional(),

  // Tax
  gstNumber:    optionalStr(50),
  trn:          optionalStr(50),
  vatNumber:    optionalStr(50),
  taxTreatment: optionalStr(80),

  // Structured billing address
  addressCountry: optionalStr(80),
  state:          optionalStr(80),
  district:       optionalStr(80),
  addressCity:    optionalStr(80),
  buildingNumber: optionalStr(20),
  postalCode:     optionalStr(20),
  streetAddress:  optionalStr(200),

  // Legacy free-text address (kept for backward compat)
  address:      optionalStr(500),

  // Additional
  businessAlias:  optionalStr(120),
  defaultDueDays: z.number().int().min(0).max(365).optional().nullable(),
  paymentAccount: optionalStr(120),
});

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
