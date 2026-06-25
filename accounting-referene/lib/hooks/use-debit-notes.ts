import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type DebitNoteItem = {
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

export type DebitNoteRow = {
  id: string;
  documentNumber: string;
  documentDate: string;
  currency: string;
  subTotal: number;
  totalAmount: number;
  debitIssued: number;
  debitConsumed: number;
  amountDue: number;
  taxRate: string;
  status: string;
  sentAt: string | null;
  fromName: string | null;
  issuedTo: string;
  clientName: string;
  clientEmail: string | null;
  client: { id: string; businessName: string; logo: string | null; email: string | null } | null;
  items: DebitNoteItem[];
  settings: unknown;
  debitReason: string | null;
  discountOffered: string | null;
  paymentStatus: string;
  paymentDate: string | null;
  emailSent: boolean;
  acceptanceStatus: "ACCEPTED" | "REJECTED" | null;
  linkedInvoiceId: string | null;
  linkedInvoiceNumber: string | null;
  workflowName: string;
  currentAssignee: string;
  currentStage: string;
  currentStatus: string;
};

export function useDebitNotes() {
  return useQuery<{ debitNotes: DebitNoteRow[]; total: number }>({
    queryKey: ["debit-notes"],
    queryFn: async () => {
      const res = await fetch("/api/debit-notes");
      if (!res.ok) throw new Error("Failed to load debit notes");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useInvoicesForDebitNote() {
  return useQuery<{
    invoices: {
      id: string;
      documentNumber: string;
      clientName: string;
      totalAmount: number;
      currency: string;
    }[];
  }>({
    queryKey: ["invoices", "for-debit-note"],
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

export function useDeleteDebitNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      toast.success("Debit note deleted");
      qc.invalidateQueries({ queryKey: ["debit-notes"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
