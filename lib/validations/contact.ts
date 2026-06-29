import { z } from "zod";

const optionalEmail = z.email().optional().or(z.literal(""));
const optionalUrl = z.url().optional().or(z.literal(""));
const optionalStr = (max = 80) => z.string().trim().max(max).optional().or(z.literal(""));

export const contactCreateSchema = z.object({
  prefix: optionalStr(10),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: optionalStr(80),
  email: optionalEmail,
  phone: optionalStr(30),
  country: z.string().trim().min(1, "Country is required").max(80),
  contactCode: optionalStr(50),
  secondaryEmail: optionalEmail,
  secondaryPhone: optionalStr(30),
  image: z.url().optional().or(z.literal("")),
  panNumber: optionalStr(20),
  aadhaarNumber: optionalStr(20),
  passportNumber: optionalStr(20),
  linkedinUrl: optionalUrl,
  xUrl: optionalUrl,
  facebookUrl: optionalUrl,
  githubUrl: optionalUrl,
  addressCountry: optionalStr(80),
  state: optionalStr(80),
  district: optionalStr(80),
  city: optionalStr(80),
  building: optionalStr(120),
  postalCode: optionalStr(20),
  zipCode: optionalStr(20),
  street: optionalStr(200),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
