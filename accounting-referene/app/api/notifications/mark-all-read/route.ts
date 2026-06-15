import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/rbac";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, updated: count });
  } catch (err: unknown) {
    console.error("[notifications/mark-all-read:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
