import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { requireTeamManager } from "@/lib/api-auth";
import { normalizePermissions } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validations/rbac";
import { sendInvitationEmail } from "@/lib/mailer";

const INVITE_TTL_DAYS = 7;

function baseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const result = inviteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, email, roleId, permissions } = result.data;

  // Already a member of this business?
  const existingMember = await prisma.membership.findFirst({
    where: { businessId: auth.ctx.businessId, user: { email } },
    select: { id: true },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: { email: ["This person is already a member"] } },
      { status: 409 }
    );
  }

  // Validate role belongs to the business.
  let roleName = "Custom permissions";
  if (roleId) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, businessId: auth.ctx.businessId },
      select: { name: true },
    });
    if (!role) return NextResponse.json({ error: { roleId: ["Invalid role"] } }, { status: 400 });
    roleName = role.name;
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const normalizedPerms = permissions ? normalizePermissions(permissions) : Prisma.DbNull;

  // Re-invite (or refresh an expired/revoked invite) for the same email.
  const invite = await prisma.invitation.upsert({
    where: { businessId_email: { businessId: auth.ctx.businessId, email } },
    update: {
      name: name || null,
      roleId: roleId ?? null,
      permissions: normalizedPerms,
      token,
      status: "pending",
      invitedById: auth.ctx.userId,
      expiresAt,
    },
    create: {
      businessId: auth.ctx.businessId,
      name: name || null,
      email,
      roleId: roleId ?? null,
      permissions: normalizedPerms,
      token,
      invitedById: auth.ctx.userId,
      expiresAt,
    },
  });

  const inviteUrl = `${baseUrl(req)}/invite/${token}`;

  const business = await prisma.business.findUnique({
    where: { id: auth.ctx.businessId },
    select: { name: true, brandName: true },
  });
  const inviter = await prisma.user.findUnique({
    where: { id: auth.ctx.userId },
    select: { name: true },
  });

  const emailSent = await sendInvitationEmail({
    to: email,
    inviteUrl,
    businessName: business?.brandName || business?.name || "your team",
    roleName,
    inviterName: inviter?.name,
  });

  return NextResponse.json(
    { id: invite.id, inviteUrl, emailSent },
    { status: 201 }
  );
}
