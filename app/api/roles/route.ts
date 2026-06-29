import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTeamManager } from "@/lib/api-auth";
import { normalizePermissions } from "@/lib/permissions";
import { roleSchema } from "@/lib/validations/rbac";

export async function GET() {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;

  const roles = await prisma.role.findMany({
    where: { businessId: auth.ctx.businessId },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { memberships: true } } },
  });

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: normalizePermissions(r.permissions),
      memberCount: r._count.memberships,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const result = roleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, description, permissions } = result.data;

  try {
    const role = await prisma.role.create({
      data: {
        businessId: auth.ctx.businessId,
        name,
        description: description || null,
        permissions: normalizePermissions(permissions),
      },
    });
    return NextResponse.json({ id: role.id }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: { name: ["A role with this name already exists"] } },
        { status: 409 }
      );
    }
    console.error("[roles:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
