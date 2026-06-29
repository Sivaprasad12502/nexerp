import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type PermissionAction,
  type PermissionSet,
  can,
  fullPermissions,
  normalizePermissions,
} from "@/lib/permissions";

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/** Resolve the currently authenticated user id from the NextAuth session. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * Ensure a business owner has the bootstrap "Super Admin" role and an owner
 * Membership. Idempotent — safe to call on every context resolution so that
 * businesses created before RBAC existed are self-healed. Returns the
 * membership id, or null if the user owns no business.
 */
export async function ensureOwnerSetup(userId: string): Promise<string | null> {
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!business) return null;

  return prisma.$transaction(async (tx) => {
    let role = await tx.role.findFirst({
      where: { businessId: business.id, isSystem: true },
      select: { id: true },
    });
    if (!role) {
      role = await tx.role.create({
        data: {
          businessId: business.id,
          name: SUPER_ADMIN_ROLE_NAME,
          description: "Full access to every module and setting.",
          isSystem: true,
          permissions: fullPermissions(),
        },
        select: { id: true },
      });
    }

    const existing = await tx.membership.findUnique({
      where: { businessId_userId: { businessId: business.id, userId } },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.membership.create({
      data: {
        businessId: business.id,
        userId,
        roleId: role.id,
        isOwner: true,
        status: "active",
      },
      select: { id: true },
    });
    return created.id;
  });
}

export type RbacContext = {
  userId: string;
  membershipId: string;
  businessId: string;
  isOwner: boolean;
  status: string;
  role: { id: string; name: string; isSystem: boolean } | null;
  permissions: PermissionSet;
};

/**
 * Resolve the acting user's business context: their single Membership (owner
 * or invited) plus the effective permission set. Returns null when there is no
 * authenticated user or the user belongs to no business yet.
 */
export async function getRbacContext(): Promise<RbacContext | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Self-heal owners that predate RBAC, then load the membership.
  await ensureOwnerSetup(userId);

  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { role: true },
  });
  if (!membership) return null;

  const isOwnerLike = membership.isOwner || membership.role?.isSystem === true;
  const permissions = isOwnerLike
    ? fullPermissions()
    : normalizePermissions(membership.permissions ?? membership.role?.permissions);

  return {
    userId,
    membershipId: membership.id,
    businessId: membership.businessId,
    isOwner: membership.isOwner,
    status: membership.status,
    role: membership.role
      ? { id: membership.role.id, name: membership.role.name, isSystem: membership.role.isSystem }
      : null,
    permissions,
  };
}

/** Whether the context allows an action on a module (owners always do). */
export function ctxCan(
  ctx: RbacContext,
  moduleKey: string,
  action: PermissionAction
): boolean {
  if (ctx.isOwner) return true;
  return can(ctx.permissions, moduleKey, action);
}

/**
 * True if the context may manage team users/roles — i.e. the owner or anyone
 * with "create" on the Business User Management module.
 */
export function canManageTeam(ctx: RbacContext): boolean {
  return ctx.isOwner || ctxCan(ctx, "business-user-management", "create");
}
