"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validations/stock-adjustment";

const COMMON_REASONS = [
  "Purchase",
  "Returned Stock",
  "Stock Correction",
  "Damaged Goods",
  "Physical Verification Adjustment",
];

type Warehouse = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  warehouses: Warehouse[];
};

export function AdjustStockModal({ open, onClose, productId, productName, warehouses }: Props) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      type: "INCOMING",
      warehouseId: warehouses[0]?.id ?? "",
      quantity: undefined,
      rate: undefined,
      adjustedValue: undefined,
      vendor: "",
      reason: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type: "INCOMING",
        warehouseId: warehouses[0]?.id ?? "",
        quantity: undefined,
        rate: undefined,
        adjustedValue: undefined,
        vendor: "",
        reason: "",
        notes: "",
      });
    }
  }, [open, warehouses, reset]);

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

  const mutation = useMutation({
    mutationFn: async (data: StockAdjustmentInput) => {
      const res = await fetch(`/api/products/${productId}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to adjust stock");
      return body;
    },
    onSuccess: () => {
      toast.success("Stock adjusted successfully");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;

  const type = watch("type");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Adjust Stock</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{productName}</p>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mt-5 space-y-4">
          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Adjustment Type</label>
            <div className="flex gap-3">
              {(["INCOMING", "OUTGOING"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === "INCOMING"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-400 bg-red-50 text-red-700"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    value={t}
                    {...register("type")}
                    className="sr-only"
                  />
                  {t === "INCOMING" ? "Incoming Stock" : "Outgoing Stock"}
                </label>
              ))}
            </div>
          </div>

          {/* Warehouse */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              {...register("warehouseId")}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            {errors.warehouseId && <p className="mt-1 text-xs text-red-500">{errors.warehouseId.message}</p>}
          </div>

          {/* Quantity + Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="0"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Rate</label>
              <input
                type="number"
                step="any"
                min="0"
                {...register("rate", { valueAsNumber: true })}
                placeholder="0.00"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
              />
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Vendor</label>
            <input
              {...register("vendor")}
              placeholder="Vendor name (optional)"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              {...register("reason")}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
              defaultValue=""
            >
              <option value="" disabled>Select a reason</option>
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Additional notes (optional)"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]"
            />
          </div>

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
              disabled={mutation.isPending}
              className="rounded-md bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white hover:bg-[#5b21b6] disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Adjust Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
