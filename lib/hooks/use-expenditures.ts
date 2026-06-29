import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ExpenditureItem = {
  id: string;
  name: string;
  hsnSac: string | null;
  sku: string | null;
  taxRate: number;
  quantity: number;
  rate: number;
  amount: number;
  total: number;
};

export type ExpenditureRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  createdAt: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  status: string;
  sentAt: string | null;
  purchasedAt: string | null;
  paymentStatus: string;
  paymentDate: string | null;
  clientName: string | null;
  fromName: string | null;
  vendorName: string;
  vendorEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: ExpenditureItem[];
  emailSent: boolean;
};

export function useExpenditures() {
  return useQuery<{ expenditures: ExpenditureRow[]; total: number }>({
    queryKey: ["expenditures"],
    queryFn: async () => {
      const res = await fetch("/api/expenditures");
      if (!res.ok) throw new Error("Failed to load expenditures");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDeleteExpenditure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Expenditure deleted");
      qc.invalidateQueries({ queryKey: ["expenditures"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
