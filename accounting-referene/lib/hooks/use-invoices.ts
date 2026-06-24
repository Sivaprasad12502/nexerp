import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type InvoiceItem = {
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

export type InvoiceRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  status: string;
  sentAt: string | null;
  fromName: string | null;
  billedTo: string;
  clientName: string;
  clientEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: InvoiceItem[];
  settings: unknown;
  paymentStatus: string;
  paymentDate: string | null;
  reverseCharge: string;
  eInvoiceStatus: string;
  eInvoiceDetails: string | null;
  eInvoiceAckNo: string | null;
  eInvoiceAckDate: string | null;
  eWayBillNo: string | null;
  eWayBillDate: string | null;
  eWayBillValidTill: string | null;
  emailSent: boolean;
  acceptanceStatus: "ACCEPTED" | null;
  isFromSalesOrder: boolean;
  sourceType: string | null;
  sourceId: string | null;
  salesOrderId: string | null;
  salesOrderNumber: string | null;
  workflowName: string;
  currentAssignee: string;
  currentStage: string;
  currentStatus: string;
};

export function useInvoices() {
  return useQuery<{ invoices: InvoiceRow[]; total: number }>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const now = new Date().toISOString();
      const res = await fetch(`/api/documents/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            paymentStatus: "PAID",
            paymentDate: now,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to mark as paid");
      return json;
    },
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
