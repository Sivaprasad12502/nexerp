"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ChevronDown } from "lucide-react";
import { warehouseCreateSchema, type WarehouseCreateInput } from "@/lib/validations/warehouse";

type Warehouse = {
  id: string;
  name: string;
  warehouseCode?: string | null;
  vatNumber?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  streetAddress?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  contactInfo?: string | null;
  notes?: string | null;
  isDefault: boolean;
  warehouseStatus?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingWarehouse?: Warehouse | null;
};

const INPUT =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm text-zinc-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function WarehouseFormModal({ open, onClose, onSaved, editingWarehouse }: Props) {
  const isEdit = !!editingWarehouse;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<WarehouseCreateInput>({
    resolver: zodResolver(warehouseCreateSchema) as any,
    defaultValues: {
      name: "",
      warehouseCode: "",
      vatNumber: "",
      country: "United Arab Emirates (UAE)",
      state: "",
      city: "",
      postalCode: "",
      streetAddress: "",
      email: "",
      phone: "",
      location: "",
      contactInfo: "",
      notes: "",
      isDefault: false,
      warehouseStatus: "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        editingWarehouse
          ? {
              name: editingWarehouse.name,
              warehouseCode: editingWarehouse.warehouseCode ?? "",
              vatNumber: editingWarehouse.vatNumber ?? "",
              country: editingWarehouse.country ?? "United Arab Emirates (UAE)",
              state: editingWarehouse.state ?? "",
              city: editingWarehouse.city ?? "",
              postalCode: editingWarehouse.postalCode ?? "",
              streetAddress: editingWarehouse.streetAddress ?? "",
              email: editingWarehouse.email ?? "",
              phone: editingWarehouse.phone ?? "",
              location: editingWarehouse.location ?? "",
              contactInfo: editingWarehouse.contactInfo ?? "",
              notes: editingWarehouse.notes ?? "",
              isDefault: editingWarehouse.isDefault,
              warehouseStatus:
                (editingWarehouse.warehouseStatus as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
            }
          : {
              name: "",
              warehouseCode: "",
              vatNumber: "",
              country: "United Arab Emirates (UAE)",
              state: "",
              city: "",
              postalCode: "",
              streetAddress: "",
              email: "",
              phone: "",
              location: "",
              contactInfo: "",
              notes: "",
              isDefault: false,
              warehouseStatus: "ACTIVE",
            },
      );
    }
  }, [open, editingWarehouse, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(values: WarehouseCreateInput) {
    const url = isEdit ? `/api/warehouses/${editingWarehouse!.id}` : "/api/warehouses";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Failed to save warehouse");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5">
          <h2 className="text-lg font-bold text-zinc-900">
            {isEdit ? "Edit Warehouse" : "Add New Warehouse"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-7 pb-2">
            {/* Warehouse ID */}
            <div>
              <Label>Warehouse ID</Label>
              <input
                {...register("warehouseCode")}
                placeholder=""
                className={INPUT}
              />
            </div>

            {/* Warehouse Name */}
            <div>
              <Label required>Warehouse Name</Label>
              <input
                {...register("name")}
                placeholder=""
                className={INPUT}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Warehouse VAT */}
            <div>
              <Label>Warehouse VAT</Label>
              <input {...register("vatNumber")} placeholder="" className={INPUT} />
            </div>

            {/* Country + State/Province */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Country</Label>
                <div className="relative">
                  <input
                    {...register("country")}
                    className={INPUT}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>
              <div>
                <Label required>State / Province</Label>
                <div className="relative">
                  <input
                    {...register("state")}
                    placeholder="Select..."
                    className={INPUT}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>
            </div>

            {/* City/Town + Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>City / Town</Label>
                <input {...register("city")} placeholder="" className={INPUT} />
              </div>
              <div>
                <Label required>Postal Code / Zip Code</Label>
                <input {...register("postalCode")} placeholder="" className={INPUT} />
              </div>
            </div>

            {/* Street Address */}
            <div>
              <Label required>Street Address</Label>
              <input {...register("streetAddress")} placeholder="" className={INPUT} />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder=""
                  className={INPUT}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label>Phone</Label>
                <div className="flex overflow-hidden rounded-md border border-zinc-200 focus-within:border-[#6d28d9] focus-within:ring-1 focus-within:ring-[#6d28d9]">
                  <div className="flex shrink-0 items-center gap-1 border-r border-zinc-200 bg-white px-2.5 py-2.5 text-sm text-zinc-700">
                    <span>🇦🇪</span>
                    <ChevronDown className="size-3 text-zinc-400" />
                    <span className="ml-0.5">+971</span>
                  </div>
                  <input
                    {...register("phone")}
                    placeholder=""
                    className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#6d28d9] px-6 py-2 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
