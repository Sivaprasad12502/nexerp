import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTeamManager } from "@/lib/api-auth";
import { normalizePermissions } from "@/lib/permissions";
import { roleSchema } from "@/lib/validations/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;
  const { id } = await params;

  const role = await prisma.role.findFirst({
    where: { id, businessId: auth.ctx.businessId },
    select: { id: true, isSystem: true },
  });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ error: "The Super Admin role cannot be edited" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = roleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, description, permissions } = result.data;

  try {
    await prisma.role.update({
      where: { id },
      data: {
        name,
        description: description || null,
        permissions: normalizePermissions(permissions),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: { name: ["A role with this name already exists"] } },
        { status: 409 }
      );
    }
    console.error("[roles:PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;
  const { id } = await params;

  const role = await prisma.role.findFirst({
    where: { id, businessId: auth.ctx.businessId },
    include: { _count: { select: { memberships: true } } },
  });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ error: "The Super Admin role cannot be deleted" }, { status: 403 });
  }
  if (role._count.memberships > 0) {
    return NextResponse.json(
      { error: "Reassign users on this role before deleting it" },
      { status: 409 }
    );
  }

  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
