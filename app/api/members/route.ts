import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTeamManager } from "@/lib/api-auth";
import { normalizePermissions } from "@/lib/permissions";

export async function GET() {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;

  const [memberships, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { businessId: auth.ctx.businessId },
      orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        role: { select: { id: true, name: true, isSystem: true } },
      },
    }),
    prisma.invitation.findMany({
      where: { businessId: auth.ctx.businessId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { role: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    currentUserId: auth.ctx.userId,
    members: memberships.map((m) => ({
      id: m.id,
      isOwner: m.isOwner,
      status: m.status,
      user: m.user,
      role: m.role,
      hasOverride: m.permissions != null,
      permissions: m.permissions != null ? normalizePermissions(m.permissions) : null,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      name: i.name,
      role: i.role,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
  });
}
