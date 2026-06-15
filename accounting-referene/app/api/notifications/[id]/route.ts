import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/rbac";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteCtx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // updateMany scopes by userId to prevent marking another user's notifications
    const { count } = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[notifications:PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
