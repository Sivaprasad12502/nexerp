"use client";

import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";

import { useNotifications, type NotificationItem } from "@/lib/hooks/use-notifications";
import { getNotificationHref } from "@/lib/notification-routing";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcon: Record<string, string> = {
  QUOTATION_SENT:          "📤",
  QUOTATION_VIEWED:        "👁️",
  QUOTATION_APPROVED:      "✅",
  QUOTATION_REJECTED:      "❌",
  VENDOR_LINKED:           "🔗",
  PURCHASE_ORDER_RECEIVED: "📦",
  INVOICE_RECEIVED:        "🧾",
  PAYMENT_RECEIVED:        "💰",
};

function ActivityRow({ item }: { item: NotificationItem }) {
  const href = getNotificationHref(item.entityType, item.entityId);
  const content = (
    <>
      <span className="mt-0.5 shrink-0 text-base">{typeIcon[item.type] ?? "🔔"}</span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            item.isRead ? "text-zinc-600" : "font-semibold text-zinc-900"
          }`}
        >
          {item.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{item.message}</p>
      </div>
      <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(item.createdAt)}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-start gap-3 py-2.5 hover:bg-zinc-50">
        {content}
      </Link>
    );
  }

  return <div className="flex items-start gap-3 py-2.5">{content}</div>;
}

export function NotificationsWidget() {
  const { data, isLoading } = useNotifications({ page: 1, pageSize: 5 });
  const items = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {/* Widget header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-[#7438dc]" />
          <h3 className="text-base font-semibold text-zinc-800">Recent Activity</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#7438dc] px-2 py-0.5 text-[11px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <Link
          href="/notifications"
          className="flex items-center gap-1 text-xs font-medium text-[#7438dc] hover:text-[#5a28b0]"
        >
          View all
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-6 shrink-0 animate-pulse rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-zinc-100" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Bell className="size-7 text-zinc-200" />
            <p className="text-sm text-zinc-400">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
