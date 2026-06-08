import { z } from "zod";

export const businessStep1Schema = z.object({
  name: z.string().min(1, "Business name is required"),
  brandName: z.string().optional(),
  teamSize: z.string().min(1, "Team size is required"),
  website: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || z.string().url().safeParse(v).success, {
      message: "Must be a valid URL",
    }),
  phone: z.string().min(7, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  hasGst: z.boolean(),
  gstNumber: z.string().optional(),
});

export const businessStep2Schema = z.object({
  usedFor: z.array(z.string()).min(1, "Select at least one option"),
  category: z.string().optional(),
});

export const businessSchema = businessStep1Schema.merge(businessStep2Schema);

export type BusinessInput = z.infer<typeof businessSchema>;
export type BusinessStep1Input = z.infer<typeof businessStep1Schema>;
export type BusinessStep2Input = z.infer<typeof businessStep2Schema>;
