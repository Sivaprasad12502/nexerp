import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { VendorLeadRow } from "@/lib/vendor-lead-mapper";
import type {
  VendorLeadCreateInput,
  VendorLeadUpdateInput,
  VendorLeadWorkflowInput,
} from "@/lib/validations/vendor-lead";

export type { VendorLeadRow };

export type VendorLeadFilters = {
  search?: string;
  status?: string;
  country?: string;
  currentStage?: string;
  currentStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

function buildQuery(filters: VendorLeadFilters = {}) {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.status) p.set("status", filters.status);
  if (filters.country) p.set("country", filters.country);
  if (filters.currentStage) p.set("currentStage", filters.currentStage);
  if (filters.currentStatus) p.set("currentStatus", filters.currentStatus);
  if (filters.page) p.set("page", String(filters.page));
  if (filters.limit) p.set("limit", String(filters.limit));
  if (filters.sortBy) p.set("sortBy", filters.sortBy);
  if (filters.sortDir) p.set("sortDir", filters.sortDir);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function useVendorLeads(filters: VendorLeadFilters = {}) {
  return useQuery<{ vendorLeads: VendorLeadRow[]; total: number; page: number; limit: number }>({
    queryKey: ["vendor-leads", filters],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-leads${buildQuery(filters)}`);
      if (!res.ok) throw new Error("Failed to load vendor leads");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useVendorLead(id: string | null) {
  return useQuery<{ vendorLead: VendorLeadRow }>({
    queryKey: ["vendor-leads", id],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-leads/${id}`);
      if (!res.ok) throw new Error("Failed to load vendor lead");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useCreateVendorLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: VendorLeadCreateInput) => {
      const res = await fetch("/api/vendor-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create vendor lead");
      return json as { vendorLead: VendorLeadRow };
    },
    onSuccess: () => {
      toast.success("Vendor lead created");
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVendorLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorLeadUpdateInput }) => {
      const res = await fetch(`/api/vendor-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update vendor lead");
      return json as { vendorLead: VendorLeadRow };
    },
    onSuccess: (_, { id }) => {
      toast.success("Vendor lead updated");
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
      qc.invalidateQueries({ queryKey: ["vendor-leads", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVendorLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendor-leads/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete vendor lead");
      return json;
    },
    onSuccess: () => {
      toast.success("Vendor lead deleted");
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConvertVendorLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendor-leads/${id}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to convert vendor lead");
      return json;
    },
    onSuccess: () => {
      toast.success("Vendor lead converted to active vendor");
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVendorLeadWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorLeadWorkflowInput }) => {
      const res = await fetch(`/api/vendor-leads/${id}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update workflow");
      return json as { vendorLead: VendorLeadRow };
    },
    onSuccess: (_, { id }) => {
      toast.success("Workflow updated");
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
      qc.invalidateQueries({ queryKey: ["vendor-leads", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
