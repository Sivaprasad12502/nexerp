import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CreditNoteItem = {
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

export type CreditNoteRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  creditIssued: number;
  creditConsumed: number;
  amountDue: number;
  taxRate: string;
  status: string;
  sentAt: string | null;
  fromName: string | null;
  issuedTo: string;
  clientName: string;
  clientEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: CreditNoteItem[];
  settings: unknown;
  creditReason: string | null;
  discountOffered: string | null;
  emailSent: boolean;
  acceptanceStatus: null;
  linkedInvoiceId: string | null;
  linkedInvoiceNumber: string | null;
  workflowName: string;
  currentAssignee: string;
  currentStage: string;
  currentStatus: string;
};

export function useCreditNotes() {
  return useQuery<{ creditNotes: CreditNoteRow[]; total: number }>({
    queryKey: ["credit-notes"],
    queryFn: async () => {
      const res = await fetch("/api/credit-notes");
      if (!res.ok) throw new Error("Failed to load credit notes");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useInvoicesForCreditNote() {
  return useQuery<{
    invoices: {
      id: string;
      documentNumber: string;
      clientName: string;
      totalAmount: number;
      currency: string;
    }[];
  }>({
    queryKey: ["invoices", "for-credit-note"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to load invoices");
      const data = await res.json();
      return {
        invoices: (data.invoices ?? []).map(
          (inv: {
            id: string;
            documentNumber: string;
            clientName: string;
            totalAmount: number;
            currency: string;
          }) => ({
            id: inv.id,
            documentNumber: inv.documentNumber,
            clientName: inv.clientName,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
          }),
        ),
      };
    },
    staleTime: 60_000,
  });
}

export function useDeleteCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Credit note deleted");
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
