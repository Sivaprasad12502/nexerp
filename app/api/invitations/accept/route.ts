import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { acceptInviteSchema } from "@/lib/validations/rbac";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const result = acceptInviteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { token, name, password } = result.data;

  const invite = await prisma.invitation.findUnique({ where: { token } });
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "This invitation is no longer valid" }, { status: 410 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
  }

  const session = await getServerSession(authOptions);
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, email: true, password: true },
  });

  let userId: string;
  let createdNew = false;

  if (session?.user?.id) {
    // A logged-in user can only accept an invite addressed to their own email.
    if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation is for ${invite.email}. Please log in with that account.` },
        { status: 403 }
      );
    }
    userId = session.user.id;
  } else if (existingUser?.password) {
    // Password-protected account, but the visitor isn't logged in as them.
    return NextResponse.json({ needsLogin: true }, { status: 200 });
  } else if (existingUser) {
    // Passwordless account (e.g. created via Google sign-in): let the invitee
    // set a password using the secret link that was emailed to their address.
    if (!password) {
      return NextResponse.json(
        { error: { password: ["Password is required"] } },
        { status: 400 }
      );
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashed, ...(name ? { name } : {}), emailVerified: new Date() },
    });
    userId = existingUser.id;
  } else {
    // Brand-new user: require name + password to create the account.
    if (!name || !password) {
      return NextResponse.json(
        { error: { password: ["Name and password are required"] } },
        { status: 400 }
      );
    }
    const hashed = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: { email: invite.email, name, password: hashed, emailVerified: new Date() },
      select: { id: true },
    });
    userId = created.id;
    createdNew = true;
  }

  const permValue =
    invite.permissions == null
      ? Prisma.DbNull
      : (invite.permissions as Prisma.InputJsonValue);

  // Create or refresh the membership, then mark the invitation accepted.
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { businessId_userId: { businessId: invite.businessId, userId } },
      update: {
        roleId: invite.roleId,
        permissions: permValue,
        status: "active",
      },
      create: {
        businessId: invite.businessId,
        userId,
        roleId: invite.roleId,
        permissions: permValue,
        status: "active",
      },
    }),
    prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    }),
  ]);

  return NextResponse.json({ success: true, createdNew, email: invite.email });
}
