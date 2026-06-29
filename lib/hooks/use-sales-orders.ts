import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type SalesOrderItem = {
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

export type SalesOrderRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  status: string;
  sentAt: string | null;
  fromName: string | null;
  clientName: string;
  clientEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: SalesOrderItem[];
  isConvertedToInvoice: boolean;
  invoiceDocumentId: string | null;
  invoiceDocumentNumber: string | null;
  isConvertedToPurchaseOrder: boolean;
  purchaseOrderDocumentId: string | null;
  acceptanceStatus: "ACCEPTED";
  emailSent: boolean;
  workflowStatus: string;
};

export function useSalesOrders() {
  return useQuery<{ salesOrders: SalesOrderRow[]; total: number }>({
    queryKey: ["sales-orders"],
    queryFn: async () => {
      const res = await fetch("/api/sales-orders");
      if (!res.ok) throw new Error("Failed to load sales orders");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useConvertSalesOrderToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      const res = await fetch(`/api/documents/${salesOrderId}/convert-invoice`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Conversion failed");
      return json as { document: { id: string; documentNumber: string }; created: boolean };
    },
    onSuccess: (data) => {
      toast.success(
        data.created
          ? `Invoice ${data.document.documentNumber} created successfully!`
          : "Invoice already exists for this sales order.",
      );
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useNextDocumentNumber(type: string) {
  return useQuery<{ nextNumber: string; type: string }>({
    queryKey: ["next-document-number", type],
    queryFn: async () => {
      const res = await fetch(`/api/documents/next-number?type=${encodeURIComponent(type)}`);
      if (!res.ok) throw new Error("Failed to fetch next document number");
      return res.json();
    },
    staleTime: 0, // always refetch — count changes after each conversion
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Sales order deleted");
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
