import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type PurchaseOrderItem = {
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

export type PurchaseOrderRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  status: string;
  sentAt: string | null;
  purchasedAt: string | null;
  clientName: string | null;
  fromName: string | null;
  vendorName: string;
  vendorEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: PurchaseOrderItem[];
  isConvertedToPurchase: boolean;
  purchaseDocumentId: string | null;
  purchaseDocumentNumber: string | null;
  acceptanceStatus: "ACCEPTED" | "PENDING" | null;
  emailSent: boolean;
  workflowStatus: string;
};

export function usePurchaseOrders() {
  return useQuery<{ purchaseOrders: PurchaseOrderRow[]; total: number }>({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders");
      if (!res.ok) throw new Error("Failed to load purchase orders");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useConvertPoToPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const res = await fetch(`/api/documents/${purchaseOrderId}/convert-purchase`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Conversion failed");
      return json as { document: { id: string; documentNumber: string }; created: boolean };
    },
    onSuccess: (data) => {
      toast.success(
        data.created
          ? `Converted to purchase ${data.document.documentNumber}`
          : "Purchase already exists for this PO",
      );
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendPurchaseOrderEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      to,
      subject,
      message,
    }: {
      id: string;
      to: string;
      subject: string;
      message: string;
    }) => {
      const res = await fetch(`/api/documents/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send email");
      return json as { success: boolean; emailSent: boolean };
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Purchase order sent to vendor");
      } else {
        toast.warning("Email not sent — SMTP may not be configured");
      }
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Purchase order deleted");
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
