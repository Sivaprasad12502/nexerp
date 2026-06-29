import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTeamManager } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

// Revoke (delete) a pending invitation so the email can be re-invited later.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireTeamManager();
  if (auth.error) return auth.error;
  const { id } = await params;

  const invite = await prisma.invitation.findFirst({
    where: { id, businessId: auth.ctx.businessId },
    select: { id: true },
  });
  if (!invite) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  await prisma.invitation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
