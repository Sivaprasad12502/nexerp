import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ProformaInvoiceItem = {
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

export type ProformaInvoiceRow = {
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
  items: ProformaInvoiceItem[];
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
  isConvertedToInvoice: boolean;
  convertedInvoiceId: string | null;
  convertedInvoiceNumber: string | null;
  sourceType: string | null;
  sourceId: string | null;
  salesOrderId: string | null;
  salesOrderNumber: string | null;
  workflowName: string;
  currentAssignee: string;
  currentStage: string;
  currentStatus: string;
};

export function useProformaInvoices() {
  return useQuery<{ proformaInvoices: ProformaInvoiceRow[]; total: number }>({
    queryKey: ["proforma-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/proforma-invoices");
      if (!res.ok) throw new Error("Failed to load proforma invoices");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useMarkProformaPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proformaId: string) => {
      const now = new Date().toISOString();
      const res = await fetch(`/api/proforma-invoices/${proformaId}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDate: now }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to mark as paid");
      return json;
    },
    onSuccess: () => {
      toast.success("Proforma invoice marked as paid");
      qc.invalidateQueries({ queryKey: ["proforma-invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["payment-receipts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteProformaInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Proforma invoice deleted");
      qc.invalidateQueries({ queryKey: ["proforma-invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useConvertProformaToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proformaId: string) => {
      const res = await fetch(`/api/proforma-invoices/${proformaId}/convert-invoice`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to convert to invoice");
      return json as { document: { id: string; documentNumber: string } };
    },
    onSuccess: (data) => {
      toast.success(`Converted to invoice ${data.document.documentNumber}`);
      qc.invalidateQueries({ queryKey: ["proforma-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
