import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type DeliveryChallanItem = {
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

export type DeliveryChallanRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  challanAmount: number;
  taxRate: string;
  status: string;
  workflowStatus: "CREATED" | "SENT" | "SEEN";
  sentAt: string | null;
  fromName: string | null;
  issuedTo: string;
  clientName: string;
  clientEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: DeliveryChallanItem[];
  settings: unknown;
  emailSent: boolean;
  workflowName: string;
  currentAssignee: string;
  currentStage: string;
  currentStatus: string;
};

export function useDeliveryChallans() {
  return useQuery<{ deliveryChallans: DeliveryChallanRow[]; total: number }>({
    queryKey: ["delivery-challans"],
    queryFn: async () => {
      const res = await fetch("/api/delivery-challans");
      if (!res.ok) throw new Error("Failed to load delivery challans");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDeleteDeliveryChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Delivery challan deleted");
      qc.invalidateQueries({ queryKey: ["delivery-challans"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
