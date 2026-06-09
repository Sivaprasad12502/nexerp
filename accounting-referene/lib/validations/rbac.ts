import { z } from "zod";

import { PERMISSION_ACTIONS } from "@/lib/permissions";

const modulePermissionSchema = z.object(
  Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, z.boolean()])) as Record<
    (typeof PERMISSION_ACTIONS)[number],
    z.ZodBoolean
  >
);

// A loose record of module -> action flags. normalizePermissions() on the
// server drops unknown keys, so we only require the value shape here.
export const permissionSetSchema = z.record(z.string(), modulePermissionSchema);

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name must be at least 2 characters").max(50),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  permissions: permissionSetSchema,
});

export type RoleInput = z.infer<typeof roleSchema>;

export const inviteSchema = z
  .object({
    name: z.string().trim().max(80).optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    roleId: z.string().min(1).optional().nullable(),
    // Optional per-user override; when omitted the role's permissions apply.
    permissions: permissionSetSchema.optional(),
  })
  .refine((v) => Boolean(v.roleId) || Boolean(v.permissions), {
    message: "Select a role or set custom permissions",
    path: ["roleId"],
  });

export type InviteInput = z.infer<typeof inviteSchema>;

export const membershipUpdateSchema = z
  .object({
    roleId: z.string().min(1).nullable().optional(),
    permissions: permissionSetSchema.nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  // Required only when creating a brand-new account.
  name: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
