import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { PayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import type {
  PayoutReceiptCreateInput,
  PayoutReceiptUpdateInput,
} from "@/lib/validations/payout-receipt";

export type { PayoutReceiptRow };

export type PayoutReceiptFilters = {
  search?: string;
  status?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  view?: "active" | "all";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type UnpaidExpenditureRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  currency: string;
  paidTo: string | null;
  paymentStatus: string;
};

function buildQuery(filters: PayoutReceiptFilters = {}) {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.status) p.set("status", filters.status);
  if (filters.vendorId) p.set("vendorId", filters.vendorId);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  if (filters.view) p.set("view", filters.view);
  if (filters.page) p.set("page", String(filters.page));
  if (filters.limit) p.set("limit", String(filters.limit));
  if (filters.sortBy) p.set("sortBy", filters.sortBy);
  if (filters.sortDir) p.set("sortDir", filters.sortDir);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function usePayoutReceipts(filters: PayoutReceiptFilters = {}) {
  return useQuery<{
    payoutReceipts: PayoutReceiptRow[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["payout-receipts", filters],
    queryFn: async () => {
      const res = await fetch(`/api/payout-receipts${buildQuery(filters)}`);
      if (!res.ok) throw new Error("Failed to load payout receipts");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function usePayoutReceipt(id: string | null) {
  return useQuery<{ payoutReceipt: PayoutReceiptRow }>({
    queryKey: ["payout-receipts", id],
    queryFn: async () => {
      const res = await fetch(`/api/payout-receipts/${id}`);
      if (!res.ok) throw new Error("Failed to load payout receipt");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useUnpaidExpenditures(vendorId: string | null) {
  return useQuery<{ expenditures: UnpaidExpenditureRow[] }>({
    queryKey: ["payout-receipts", "unpaid-expenditures", vendorId],
    queryFn: async () => {
      const res = await fetch(
        `/api/payout-receipts/unpaid-expenditures?vendorId=${encodeURIComponent(vendorId!)}`,
      );
      if (!res.ok) throw new Error("Failed to load unpaid expenditures");
      return res.json();
    },
    enabled: Boolean(vendorId),
  });
}

export function useCreatePayoutReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PayoutReceiptCreateInput) => {
      const res = await fetch("/api/payout-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create payout receipt");
      return json as { payoutReceipt: PayoutReceiptRow };
    },
    onSuccess: () => {
      toast.success("Payout receipt created");
      qc.invalidateQueries({ queryKey: ["payout-receipts"] });
      qc.invalidateQueries({ queryKey: ["expenditures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePayoutReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PayoutReceiptUpdateInput }) => {
      const res = await fetch(`/api/payout-receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update payout receipt");
      return json as { payoutReceipt: PayoutReceiptRow };
    },
    onSuccess: (_, { id }) => {
      toast.success("Payout receipt updated");
      qc.invalidateQueries({ queryKey: ["payout-receipts"] });
      qc.invalidateQueries({ queryKey: ["payout-receipts", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePayoutReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payout-receipts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete payout receipt");
      return json;
    },
    onSuccess: () => {
      toast.success("Payout receipt deleted");
      qc.invalidateQueries({ queryKey: ["payout-receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSendPayoutReceiptEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: import("@/lib/validations/payout-receipt").PayoutReceiptSendInput;
    }) => {
      const res = await fetch(`/api/payout-receipts/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send email");
      return json as { payoutReceipt: PayoutReceiptRow };
    },
    onSuccess: (_, { id }) => {
      toast.success("Payout receipt email sent");
      qc.invalidateQueries({ queryKey: ["payout-receipts"] });
      qc.invalidateQueries({ queryKey: ["payout-receipts", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function fetchNextPayoutReceiptNumber(): Promise<string> {
  const res = await fetch("/api/payout-receipts/next-number");
  if (!res.ok) throw new Error("Failed to fetch receipt number");
  const json = await res.json();
  return json.receiptNumber as string;
}
