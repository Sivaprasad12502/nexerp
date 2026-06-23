import { z } from "zod";

const optionalStr = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email format")
  .optional()
  .or(z.literal(""));

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const VENDOR_LEAD_WORKFLOW_STAGES = [
  "Initial Contact",
  "Vendor Evaluation",
  "Negotiation",
  "Approval",
  "Onboarding",
] as const;

export const VENDOR_LEAD_WORKFLOW_STATUSES = [
  "Pending",
  "In Progress",
  "Approved",
  "Rejected",
  "Onboarding",
] as const;

export const vendorLeadCreateSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(200),
  email: optionalEmail,
  phoneCode: optionalStr(10),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^[\d\s\-+()]{7,20}$/.test(v),
      "Invalid phone number",
    ),
  vendorType: z.enum(["INDIVIDUAL", "COMPANY"], {
    message: "Vendor type is required",
  }),
  subject: optionalStr(200),
  notes: optionalStr(2000),
  country: optionalStr(80),
  state: optionalStr(80),
  city: optionalStr(80),
  postalCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{6}$/.test(v), "Pincode must be 6 digits"),
  streetAddress: optionalStr(300),
  gstNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || GSTIN_REGEX.test(v.toUpperCase()),
      "Invalid GSTIN format",
    ),
  gstStateCode: optionalStr(10),
  panNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || PAN_REGEX.test(v.toUpperCase()),
      "Invalid PAN format",
    ),
  nameAsPerPan: optionalStr(120),
  paymentAccountId: optionalStr(50),
  customFields: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

export const vendorLeadUpdateSchema = vendorLeadCreateSchema.partial();

export const vendorLeadWorkflowSchema = z.object({
  workflowName: z.string().trim().min(1, "Workflow name is required").max(120),
  currentAssigneeId: optionalStr(50),
  currentStage: z.enum(VENDOR_LEAD_WORKFLOW_STAGES, {
    message: "Invalid workflow stage",
  }),
  currentStatus: z.enum(VENDOR_LEAD_WORKFLOW_STATUSES, {
    message: "Invalid status",
  }),
});

export type VendorLeadCreateInput = z.infer<typeof vendorLeadCreateSchema>;
export type VendorLeadUpdateInput = z.infer<typeof vendorLeadUpdateSchema>;
export type VendorLeadWorkflowInput = z.infer<typeof vendorLeadWorkflowSchema>;

export { PAN_REGEX, GSTIN_REGEX, IFSC_REGEX };
