import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DocumentTypeValue } from "@/lib/validations/document";

// ─── Response types ───────────────────────────────────────────────────────────

export type DocumentListItem = {
  id:             string;
  type:           string;
  documentNumber: string;
  documentDate:   string;
  currency:       string;
  totalAmount:    number;
  status:         string;
  clientName:     string | null;
  client:         { id: string; businessName: string; logo: string | null } | null;
};

export type DocumentItemRow = {
  id:          string;
  productId:   string | null;
  name:        string;
  sku:         string | null;
  hsnSac:      string | null;
  unit:        string | null;
  description: string | null;
  image:       string | null;
  groupName:   string | null;
  quantity:    number;
  rate:        number;
  discount:    number;
  taxRate:     number;
  taxAmount:   number;
  amount:      number;
  total:       number;
  sortOrder:   number;
};

export type DocumentDetail = {
  id:             string;
  type:           string;
  documentNumber: string;
  documentDate:   string;
  validTillDate:  string | null;
  title:          string | null;
  subtitle:       string | null;
  logo:           string | null;
  currency:       string;
  fromName:       string | null;
  fromAddress:    string | null;
  fromGstin:      string | null;
  fromPan:        string | null;
  clientId:       string | null;
  clientName:     string | null;
  clientAddress:  string | null;
  clientGstin:    string | null;
  discountLabel:  string | null;
  discountAmount: number;
  additionalCharges: unknown;
  subTotal:       number;
  totalTax:       number;
  totalDiscount:  number;
  totalQuantity:  number;
  totalAmount:    number;
  amountInWords:  string | null;
  termsAndConditions: string | null;
  notes:          string | null;
  signature:      string | null;
  additionalInfo: string | null;
  contactDetails: string | null;
  attachments:    string[];
  customFields:   unknown;
  settings:       unknown;
  status:         string;
  createdAt:      string;
  items:          DocumentItemRow[];
  client:         {
    id: string; businessName: string; logo: string | null;
    email: string | null; phone: string | null;
    streetAddress: string | null; addressCity: string | null;
    state: string | null; addressCountry: string | null;
    trn: string | null; vatNumber: string | null;
  } | null;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments({ type }: { type?: DocumentTypeValue | "ALL" } = {}) {
  const resolvedType = type === "ALL" ? undefined : type;
  return useQuery<{ documents: DocumentListItem[] }>({
    queryKey: ["documents", "list", resolvedType],
    queryFn: async () => {
      const url = resolvedType
        ? `/api/documents?type=${resolvedType}`
        : "/api/documents";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDocument(id: string) {
  return useQuery<{ document: DocumentDetail }>({
    queryKey: ["documents", id],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Document not found");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useConvertQuotation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quotationId,
      targetType,
    }: {
      quotationId: string;
      targetType: DocumentTypeValue;
    }) => {
      const res = await fetch(`/api/quotations/${quotationId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Conversion failed");
      return json as { document: DocumentDetail };
    },
    onSuccess: (data, vars) => {
      const label = vars.targetType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      toast.success(`Converted to ${label} successfully`);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to convert document");
    },
  });
}
