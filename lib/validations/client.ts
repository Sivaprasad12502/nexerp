import { z } from "zod";

const optionalStr = (max = 80) =>
  z.string().trim().max(max).optional().or(z.literal(""));
const optionalEmail = z.email().optional().or(z.literal(""));

export const clientCreateSchema = z.object({
  // Basic info
  logo: z.url().optional().or(z.literal("")),
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  industry: optionalStr(80),
  country: optionalStr(80),
  city: optionalStr(80),
  clientType: z.enum(["INDIVIDUAL", "COMPANY"]),

  // Tax
  trn: optionalStr(50),
  vatNumber: optionalStr(50),
  taxTreatment: optionalStr(80),

  // Billing address
  addressCountry: optionalStr(80),
  state: optionalStr(80),
  district: optionalStr(80),
  addressCity: optionalStr(80),
  buildingNumber: optionalStr(20),
  postalCode: optionalStr(20),
  streetAddress: optionalStr(200),

  // Shipping
  shippingName: optionalStr(120),
  shippingCountry: optionalStr(80),
  shippingState: optionalStr(80),
  shippingCity: optionalStr(80),
  shippingPostalCode: optionalStr(20),
  shippingStreet: optionalStr(200),

  // Additional details
  businessAlias: optionalStr(120),
  email: optionalEmail,
  showEmailInInvoice: z.boolean(),
  phoneCode: optionalStr(10),
  phone: optionalStr(30),
  showPhoneInInvoice: z.boolean(),
  defaultDueDays: z.number().int().min(0).max(365).optional().nullable(),
  paymentAccount: optionalStr(120),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
