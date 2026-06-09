import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { requireTeamManager } from "@/lib/api-auth";
import { normalizePermissions } from "@/lib/permissions";
import { membershipUpdateSchema } from "@/lib/validations/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;
  const { id } = await params;

  const membership = await prisma.membership.findFirst({
    where: { id, businessId: auth.ctx.businessId },
    select: { id: true, isOwner: true },
  });
  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (membership.isOwner) {
    return NextResponse.json({ error: "The business owner cannot be modified" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = membershipUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { roleId, permissions, status } = result.data;

  // If a roleId is provided, make sure it belongs to this business.
  if (roleId) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, businessId: auth.ctx.businessId },
      select: { id: true },
    });
    if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const data: Prisma.MembershipUpdateInput = {};
  if (roleId !== undefined) {
    data.role = roleId ? { connect: { id: roleId } } : { disconnect: true };
  }
  if (permissions !== undefined) {
    data.permissions = permissions === null ? Prisma.DbNull : normalizePermissions(permissions);
  }
  if (status !== undefined) data.status = status;

  await prisma.membership.update({ where: { id }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;
  const { id } = await params;

  const membership = await prisma.membership.findFirst({
    where: { id, businessId: auth.ctx.businessId },
    select: { id: true, isOwner: true },
  });
  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (membership.isOwner) {
    return NextResponse.json({ error: "The business owner cannot be removed" }, { status: 403 });
  }

  await prisma.membership.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
