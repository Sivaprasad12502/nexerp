import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { PaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import type {
  PaymentReceiptCreateInput,
  PaymentReceiptUpdateInput,
} from "@/lib/validations/payment-receipt";

export type { PaymentReceiptRow };

export type PaymentReceiptFilters = {
  search?: string;
  status?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  view?: "active" | "all";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type UnpaidInvoiceRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  currency: string;
  billedTo: string | null;
  paymentStatus: string;
};

function buildQuery(filters: PaymentReceiptFilters = {}) {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.status) p.set("status", filters.status);
  if (filters.clientId) p.set("clientId", filters.clientId);
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

export function usePaymentReceipts(filters: PaymentReceiptFilters = {}) {
  return useQuery<{
    paymentReceipts: PaymentReceiptRow[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["payment-receipts", filters],
    queryFn: async () => {
      const res = await fetch(`/api/payment-receipts${buildQuery(filters)}`);
      if (!res.ok) throw new Error("Failed to load payment receipts");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function usePaymentReceipt(id: string | null) {
  return useQuery<{ paymentReceipt: PaymentReceiptRow }>({
    queryKey: ["payment-receipts", id],
    queryFn: async () => {
      const res = await fetch(`/api/payment-receipts/${id}`);
      if (!res.ok) throw new Error("Failed to load payment receipt");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useUnpaidInvoices(clientId: string | null) {
  return useQuery<{ invoices: UnpaidInvoiceRow[] }>({
    queryKey: ["payment-receipts", "unpaid-invoices", clientId],
    queryFn: async () => {
      const res = await fetch(
        `/api/payment-receipts/unpaid-invoices?clientId=${encodeURIComponent(clientId!)}`,
      );
      if (!res.ok) throw new Error("Failed to load unpaid invoices");
      return res.json();
    },
    enabled: Boolean(clientId),
  });
}

export function useCreatePaymentReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PaymentReceiptCreateInput) => {
      const res = await fetch("/api/payment-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create payment receipt");
      return json as { paymentReceipt: PaymentReceiptRow };
    },
    onSuccess: () => {
      toast.success("Payment receipt created");
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePaymentReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentReceiptUpdateInput }) => {
      const res = await fetch(`/api/payment-receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update payment receipt");
      return json as { paymentReceipt: PaymentReceiptRow };
    },
    onSuccess: (_, { id }) => {
      toast.success("Payment receipt updated");
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
      qc.invalidateQueries({ queryKey: ["payment-receipts", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePaymentReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payment-receipts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete payment receipt");
      return json;
    },
    onSuccess: () => {
      toast.success("Payment receipt deleted");
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSendPaymentReceiptEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payment-receipts/${id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send email");
      return json as { paymentReceipt: PaymentReceiptRow };
    },
    onSuccess: (_, id) => {
      toast.success("Payment receipt email marked as sent");
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
      qc.invalidateQueries({ queryKey: ["payment-receipts", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function fetchNextReceiptNumber(): Promise<string> {
  const res = await fetch("/api/payment-receipts/next-number");
  if (!res.ok) throw new Error("Failed to fetch receipt number");
  const json = await res.json();
  return json.receiptNumber as string;
}
