import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/rbac";
import { notificationListQuerySchema } from "@/lib/validations/notification";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse + validate query params
  const raw = {
    page:     req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
    unread:   req.nextUrl.searchParams.get("unread") ?? undefined,
  };
  const result = notificationListQuerySchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { page, pageSize, unread } = result.data;

  const where = {
    userId,
    ...(unread !== undefined ? { isRead: !unread } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    // Always return total unread count regardless of the filter, so the bell badge stays accurate
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount, page, pageSize });
}
