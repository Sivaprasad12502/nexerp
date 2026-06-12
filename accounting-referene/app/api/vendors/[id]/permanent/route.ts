import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only archived vendors can be permanently deleted
  const existing = await prisma.vendor.findFirst({
    where: { id, businessId: ctx.businessId, status: "ARCHIVED" },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Vendor not found or must be archived before permanent deletion" },
      { status: 404 },
    );
  }

  await prisma.vendor.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
