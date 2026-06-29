import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
};

type UseNotificationsOptions = {
  page?: number;
  pageSize?: number;
  unread?: boolean;
};

export function useNotifications({
  page = 1,
  pageSize = 20,
  unread,
}: UseNotificationsOptions = {}) {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", "list", page, pageSize, unread],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (unread !== undefined) params.set("unread", String(unread));
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    staleTime: 30_000,
  });
}

/** Convenience hook that returns only the unread count — cheap to place in any component. */
export function useUnreadCount() {
  const { data } = useNotifications({ page: 1, pageSize: 1 });
  return data?.unreadCount ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/notifications/mark-all-read", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark all as read");
    },
  });
}
