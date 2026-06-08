import { z } from "zod";

export const registerSchema = z.object({
  country: z.string().min(1, "Country is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agreed: z.literal(true, {
    error: "You must agree to the Terms & Conditions",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
