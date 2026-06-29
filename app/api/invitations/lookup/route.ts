import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Public endpoint used by the invite-accept page to render invitation details.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invite = await prisma.invitation.findUnique({
    where: { token },
    include: {
      role: { select: { name: true } },
      business: { select: { name: true, brandName: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ valid: false, reason: "used" });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, password: true },
  });

  return NextResponse.json({
    valid: true,
    email: invite.email,
    name: invite.name,
    roleName: invite.role?.name ?? "Custom permissions",
    businessName: invite.business.brandName || invite.business.name,
    // Whether the invitee already has an account (decides register vs login UI).
    accountExists: Boolean(existingUser),
    hasPassword: Boolean(existingUser?.password),
  });
}
