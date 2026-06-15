"use client";

import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type NotificationItem,
} from "@/lib/hooks/use-notifications";
import { getNotificationHref } from "@/lib/notification-routing";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Icon map for notification types
const typeIcon: Record<string, string> = {
  QUOTATION_SENT:     "📤",
  QUOTATION_VIEWED:   "👁️",
  QUOTATION_APPROVED: "✅",
  QUOTATION_REJECTED: "❌",
  VENDOR_LINKED:      "🔗",
  PURCHASE_ORDER_RECEIVED: "📦",
  INVOICE_RECEIVED:   "🧾",
  PAYMENT_RECEIVED:   "💰",
};

export function NotificationBell() {
  const router = useRouter();
  const { data } = useNotifications({ page: 1, pageSize: 8 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  function handleItemClick(item: NotificationItem) {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
    const href = getNotificationHref(item.entityType, item.entityId);
    if (href) router.push(href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
          className="relative flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-zinc-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[#7438dc] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                markAll.mutate();
              }}
              className="flex items-center gap-1 text-xs font-medium text-[#7438dc] hover:text-[#5a28b0]"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-zinc-400">
            <Bell className="size-8 text-zinc-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="flex cursor-pointer items-start gap-3 rounded-none px-3 py-2.5 focus:bg-zinc-50"
              >
                {/* Unread indicator */}
                <span className="mt-0.5 shrink-0 text-base">
                  {typeIcon[item.type] ?? "🔔"}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug ${item.isRead ? "font-normal text-zinc-600" : "font-semibold text-zinc-900"}`}
                    >
                      {item.title}
                    </p>
                    {!item.isRead && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#7438dc]" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {timeAgo(item.createdAt)}
                  </p>
                </div>

                {/* Mark read icon */}
                {!item.isRead && (
                  <button
                    type="button"
                    aria-label="Mark as read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(item.id);
                    }}
                    className="mt-0.5 shrink-0 text-zinc-300 hover:text-[#7438dc]"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />

        {/* Footer */}
        <DropdownMenuItem
          onClick={() => router.push("/notifications")}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-none py-2.5 text-xs font-medium text-[#7438dc] hover:text-[#5a28b0] focus:bg-zinc-50"
        >
          View all notifications
          <ExternalLink className="size-3" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
