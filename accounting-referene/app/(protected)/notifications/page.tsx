"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getNotificationHref } from "@/lib/notification-routing";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type NotificationItem,
} from "@/lib/hooks/use-notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function typeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onMarkRead,
  onClick,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onClick: (item: NotificationItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
      className={`flex cursor-pointer items-start gap-4 border-b border-zinc-100 px-6 py-4 transition-colors hover:bg-zinc-50 ${
        !item.isRead ? "bg-violet-50/40" : ""
      }`}
    >
      {/* Type emoji */}
      <span className="mt-0.5 shrink-0 text-xl">{typeIcon[item.type] ?? "🔔"}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm leading-snug ${
              item.isRead ? "font-normal text-zinc-700" : "font-semibold text-zinc-900"
            }`}
          >
            {item.title}
          </p>
          {!item.isRead && (
            <span className="size-2 shrink-0 rounded-full bg-[#7438dc]" />
          )}
          <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {typeLabel(item.type)}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{item.message}</p>
        <p className="mt-1 text-xs text-zinc-400">{timeAgo(item.createdAt)}</p>
      </div>

      {/* Mark-read button */}
      {!item.isRead && (
        <button
          type="button"
          aria-label="Mark as read"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(item.id);
          }}
          className="mt-1 shrink-0 rounded p-1 text-zinc-300 transition-colors hover:bg-white hover:text-[#7438dc]"
        >
          <Check className="size-4" />
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({ page, pageSize: PAGE_SIZE });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleItemClick(item: NotificationItem) {
    if (!item.isRead) markRead.mutate(item.id);
    const href = getNotificationHref(item.entityType, item.entityId);
    if (href) router.push(href);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="mt-0.5 text-sm text-zinc-500">
                {unreadCount} unread
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#7438dc] hover:text-[#7438dc] disabled:opacity-50"
            >
              <CheckCheck className="size-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-zinc-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <div className="size-8 shrink-0 animate-pulse rounded-full bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded-full bg-zinc-100" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-zinc-50">
                <Bell className="size-8 text-zinc-300" />
              </div>
              <p className="text-base font-medium text-zinc-700">
                No notifications yet
              </p>
              <p className="text-sm text-zinc-400">
                You&apos;ll be notified here when something requires your attention.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
            <span>
              Page {page} of {totalPages} &mdash; {total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium transition-colors hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium transition-colors hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
