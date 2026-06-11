"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { warehouseCreateSchema, type WarehouseCreateInput } from "@/lib/validations/warehouse";

type Warehouse = {
  id: string;
  name: string;
  location?: string | null;
  contactInfo?: string | null;
  notes?: string | null;
  isDefault: boolean;
  warehouseStatus?: string;
  vatNumber?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingWarehouse?: Warehouse | null;
};

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
      location: "",
      contactInfo: "",
      notes: "",
      isDefault: false,
      warehouseStatus: "ACTIVE",
      vatNumber: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        editingWarehouse
          ? {
              name: editingWarehouse.name,
              location: editingWarehouse.location ?? "",
              contactInfo: editingWarehouse.contactInfo ?? "",
              notes: editingWarehouse.notes ?? "",
              isDefault: editingWarehouse.isDefault,
              warehouseStatus: (editingWarehouse.warehouseStatus as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
              vatNumber: editingWarehouse.vatNumber ?? "",
            }
          : {
              name: "",
              location: "",
              contactInfo: "",
              notes: "",
              isDefault: false,
              warehouseStatus: "ACTIVE",
              vatNumber: "",
            }
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

  const INPUT =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">
          {isEdit ? "Edit Warehouse" : "Add New Warehouse"}
        </h2>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Main Warehouse"
              className={INPUT}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Address / Location
            </label>
            <input
              {...register("location")}
              placeholder="e.g. 123 Main Street, Abu Dhabi"
              className={INPUT}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Contact Information
            </label>
            <input
              {...register("contactInfo")}
              placeholder="e.g. +971 50 123 4567"
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Status</label>
              <select {...register("warehouseStatus")} className={INPUT}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Warehouse VAT</label>
              <input
                {...register("vatNumber")}
                placeholder="VAT number"
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Any additional notes…"
              className={INPUT}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" {...register("isDefault")} className="rounded border-zinc-300" />
            Set as default warehouse
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white hover:bg-[#5b21b6] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Update Warehouse" : "Add Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
