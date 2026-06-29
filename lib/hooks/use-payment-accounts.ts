import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentAccountCustomField = { label: string; value: string };

export type LinkedBankSummary = {
  id: string;
  displayName: string;
  bankName: string | null;
};

export type PaymentAccount = {
  id: string;
  type: string;
  status: string;
  displayName: string;
  accountHolderName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  accountType: string | null;
  upiId: string | null;
  country: string | null;
  currency: string | null;
  swift: string | null;
  department: string | null;
  ledgerName: string | null;
  customFields: PaymentAccountCustomField[] | null;
  linkedBankAccountId: string | null;
  linkedBankAccount?: LinkedBankSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentAccountCreateInput = {
  type?: "BANK" | "EMPLOYEE" | "OTHER";
  status?: "ACTIVE" | "INACTIVE";
  displayName?: string;
  accountHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  branch?: string | null;
  accountType?: "SAVINGS" | "CURRENT" | null;
  upiId?: string | null;
  country?: string | null;
  currency?: string | null;
  swift?: string | null;
  department?: string | null;
  ledgerName?: string | null;
  customFields?: PaymentAccountCustomField[] | null;
  linkedBankAccountId?: string | null;
};

export type PaymentAccountFilters = {
  type?: "BANK" | "EMPLOYEE" | "OTHER";
  status?: "ACTIVE" | "INACTIVE";
  bankOnly?: boolean;
};

function buildQueryString(filters?: PaymentAccountFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.bankOnly) params.set("bankOnly", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePaymentAccounts(filters?: PaymentAccountFilters) {
  return useQuery<{ accounts: PaymentAccount[] }>({
    queryKey: ["payment-accounts", filters ?? {}],
    queryFn: async () => {
      const res = await fetch(`/api/payment-accounts${buildQueryString(filters)}`);
      if (!res.ok) throw new Error("Failed to load payment accounts");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreatePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PaymentAccountCreateInput) => {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create account");
      return body as { account: PaymentAccount };
    },
    onSuccess: () => {
      toast.success("Payment account added");
      qc.invalidateQueries({ queryKey: ["payment-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PaymentAccountCreateInput>;
    }) => {
      const res = await fetch(`/api/payment-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update account");
      return body as { account: PaymentAccount };
    },
    onSuccess: () => {
      toast.success("Payment account updated");
      qc.invalidateQueries({ queryKey: ["payment-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payment-accounts/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete account");
      return body;
    },
    onSuccess: () => {
      toast.success("Payment account deleted");
      qc.invalidateQueries({ queryKey: ["payment-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
