"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { vendorCreateSchema, type VendorCreateInput } from "@/lib/validations/vendor";

// ─── Canonical VendorRow type (used across list, detail, edit) ────────────────

export type VendorRow = {
  id:               string;
  businessId:       string;
  linkedBusinessId: string | null;
  name:             string;
  email:            string | null;
  phone:            string | null;
  website:          string | null;
  address:          string | null;
  gstNumber:        string | null;
  status:           "ACTIVE" | "ARCHIVED";
  createdAt:        string;
  updatedAt:        string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type VendorFormProps = {
  initialData?: VendorRow | null;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[180px_1fr] sm:items-start">
      <label className="pt-2 text-sm font-medium text-zinc-700">{label}</label>
      <div>
        {children}
        {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function VendorForm({ initialData, onCancel, onSaved }: VendorFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorCreateInput>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: {
      name:      initialData?.name      ?? "",
      email:     initialData?.email     ?? "",
      phone:     initialData?.phone     ?? "",
      website:   initialData?.website   ?? "",
      address:   initialData?.address   ?? "",
      gstNumber: initialData?.gstNumber ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: VendorCreateInput) => {
      const url    = isEdit ? `/api/vendors/${initialData!.id}` : "/api/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save vendor");
      return body as { vendor: VendorRow };
    },
    onSuccess: ({ vendor }) => {
      toast.success(isEdit ? "Vendor updated" : "Vendor added");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      if (onSaved) {
        onSaved(vendor.id);
      } else {
        router.push(`/purchases/vendors/${vendor.id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (data: VendorCreateInput) => saveMutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Basic */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Basic Information</h2>
        </div>
        <div className="space-y-4 px-6 py-4">
          <Field label="Vendor Name *">
            <Input
              {...register("name")}
              placeholder="e.g. ABC Suppliers"
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </Field>

          <Field label="Email">
            <Input
              {...register("email")}
              type="email"
              placeholder="vendor@example.com"
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </Field>

          <Field label="Phone">
            <Input
              {...register("phone")}
              placeholder="+91 98765 43210"
              className={errors.phone ? "border-red-400" : ""}
            />
          </Field>

          <Field label="Website">
            <Input
              {...register("website")}
              placeholder="https://example.com"
              className={errors.website ? "border-red-400" : ""}
            />
            {errors.website && (
              <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>
            )}
          </Field>
        </div>
      </div>

      {/* Tax */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Tax</h2>
        </div>
        <div className="space-y-4 px-6 py-4">
          <Field label="GST Number">
            <Input
              {...register("gstNumber")}
              placeholder="22AAAAA0000A1Z5"
              className={errors.gstNumber ? "border-red-400" : ""}
            />
          </Field>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Address</h2>
        </div>
        <div className="space-y-4 px-6 py-4">
          <Field label="Address">
            <Textarea
              {...register("address")}
              rows={3}
              placeholder="Street, City, State, Country"
              className={errors.address ? "border-red-400" : ""}
            />
          </Field>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
        >
          {saveMutation.isPending ? "Saving…" : isEdit ? "Update Vendor" : "Add Vendor"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.push("/purchases/vendors"))}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
