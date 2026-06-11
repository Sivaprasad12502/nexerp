"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, X, Upload } from "lucide-react";
import { productCreateSchema, type ProductCreateInput } from "@/lib/validations/product";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";

type Warehouse = { id: string; name: string };
export type ItemFormData = Partial<ProductCreateInput> & {
  id?: string;
  image?: string | null;
  tags?: string[];
};

type Props = {
  initialData?: ItemFormData | null;
  warehouses: Warehouse[];
  onSave: (data: ProductCreateInput) => Promise<void>;
  onCancel: () => void;
};

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        {title}
        {open ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
      </button>
      {open && <div className="border-t border-zinc-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const INPUT =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]";

export function ItemForm({ initialData, warehouses, onSave, onCancel }: Props) {
  const isEdit = !!initialData?.id;
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(initialData?.image ?? null);
  const [imgUploading, setImgUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema) as any,
    defaultValues: {
      itemType: initialData?.itemType ?? "PRODUCT",
      name: initialData?.name ?? "",
      sku: initialData?.sku ?? "",
      category: initialData?.category ?? "",
      unit: initialData?.unit ?? "",
      hsnSac: initialData?.hsnSac ?? "",
      canBeSold: initialData?.canBeSold ?? true,
      manageStock: initialData?.manageStock ?? true,
      image: initialData?.image ?? "",
      originalImage: initialData?.originalImage ?? "",
      description: initialData?.description ?? "",
      tags: initialData?.tags ?? [],
      purchaseLedger: initialData?.purchaseLedger ?? "",
      salesLedger: initialData?.salesLedger ?? "",
      inventoryLedger: initialData?.inventoryLedger ?? "",
      currency: initialData?.currency ?? "",
      buyingPrice: initialData?.buyingPrice ?? null,
      sellingPrice: initialData?.sellingPrice ?? null,
      landedCost: initialData?.landedCost ?? null,
      taxRate: initialData?.taxRate ?? null,
      priceInclusiveTax: initialData?.priceInclusiveTax ?? false,
      length: initialData?.length ?? null,
      breadth: initialData?.breadth ?? null,
      height: initialData?.height ?? null,
      grossWeight: initialData?.grossWeight ?? null,
      netWeight: initialData?.netWeight ?? null,
      trackingMethod: initialData?.trackingMethod ?? "NONE",
      reorderPoint: initialData?.reorderPoint ?? null,
      overstockPoint: initialData?.overstockPoint ?? null,
      initialStock: null,
      initialWarehouseId: warehouses[0]?.id ?? null,
    },
  });

  const tags = watch("tags") ?? [];
  const manageStock = watch("manageStock");

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setImgUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("image", url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setImgUploading(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setValue("tags", [...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setValue("tags", tags.filter((tag) => tag !== t));
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSave as any)} className="space-y-4">
      {/* Item Details */}
      <Section title="Item / Product Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Item Type">
            <select {...register("itemType")} className={INPUT}>
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </Field>
          <Field label="Item Name" required error={errors.name?.message}>
            <input {...register("name")} placeholder="e.g. Widget Pro" className={INPUT} />
          </Field>
          <Field label="SKU ID">
            <input {...register("sku")} placeholder="e.g. WGT-001" className={INPUT} />
          </Field>
          <Field label="Unit">
            <input {...register("unit")} placeholder="e.g. pcs, kg, box" className={INPUT} />
          </Field>
          <Field label="Category">
            <input {...register("category")} placeholder="e.g. Electronics" className={INPUT} />
          </Field>
          <Field label="HSN/SAC Code">
            <input {...register("hsnSac")} placeholder="e.g. 8471" className={INPUT} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" {...register("canBeSold")} className="rounded border-zinc-300" />
            This item can be sold to customers
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" {...register("manageStock")} className="rounded border-zinc-300" />
            Manage stock
          </label>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700">Description</label>
          <textarea {...register("description")} rows={3} placeholder="Item description…" className={INPUT} />
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}}
              placeholder="Add tag and press Enter"
              className={INPUT}
            />
            <button type="button" onClick={addTag} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
                  {t}
                  <button type="button" onClick={() => removeTag(t)}><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Image */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700">Item Image</label>
          <div className="flex items-center gap-3">
            {imgPreview ? (
              <img src={imgPreview} alt="" className="size-16 rounded-md object-cover border border-zinc-200" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50">
                <Upload className="size-5 text-zinc-300" />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                disabled={imgUploading}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {imgUploading ? "Uploading…" : "Upload Image"}
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>
        </div>
      </Section>

      {/* Accounting */}
      <Section title="Accounting Details" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Purchase Ledger">
            <input {...register("purchaseLedger")} placeholder="e.g. Purchases" className={INPUT} />
          </Field>
          <Field label="Sales Ledger">
            <input {...register("salesLedger")} placeholder="e.g. Sales" className={INPUT} />
          </Field>
          <Field label="Inventory Ledger">
            <input {...register("inventoryLedger")} placeholder="e.g. Inventory Asset" className={INPUT} />
          </Field>
        </div>
      </Section>

      {/* Pricing & Taxation */}
      <Section title="Pricing & Taxation" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Currency">
            <input {...register("currency")} placeholder="e.g. AED" className={INPUT} />
          </Field>
          <Field label="Tax Rate (%)">
            <input type="number" step="any" min="0" {...register("taxRate", { valueAsNumber: true })} placeholder="0" className={INPUT} />
          </Field>
          <Field label="Buying Price">
            <input type="number" step="any" min="0" {...register("buyingPrice", { valueAsNumber: true })} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Selling Price">
            <input type="number" step="any" min="0" {...register("sellingPrice", { valueAsNumber: true })} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Landed Cost">
            <input type="number" step="any" min="0" {...register("landedCost", { valueAsNumber: true })} placeholder="0.00" className={INPUT} />
          </Field>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" {...register("priceInclusiveTax")} className="rounded border-zinc-300" />
          Price inclusive of taxes
        </label>
      </Section>

      {/* Stock Management */}
      {manageStock && (
        <Section title="Stock Management">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tracking Method">
              <select {...register("trackingMethod")} className={INPUT}>
                <option value="NONE">None</option>
                <option value="BATCHWISE">Batchwise</option>
                <option value="SERIAL">Serial Number</option>
                <option value="BATCH_SERIAL">Batch + Serial Number</option>
              </select>
            </Field>
          </div>

          {!isEdit && warehouses.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Opening / Initial Stock">
                <input
                  type="number"
                  step="any"
                  min="0"
                  {...register("initialStock", { valueAsNumber: true })}
                  placeholder="0"
                  className={INPUT}
                />
              </Field>
              <Field label="Warehouse">
                <select {...register("initialWarehouseId")} className={INPUT}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </Section>
      )}

      {/* Reorder & Overstock */}
      <Section title="Reorder & Overstock" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Reorder Point">
            <input type="number" min="0" {...register("reorderPoint", { valueAsNumber: true })} placeholder="e.g. 10" className={INPUT} />
          </Field>
          <Field label="Overstock Point">
            <input type="number" min="0" {...register("overstockPoint", { valueAsNumber: true })} placeholder="e.g. 500" className={INPUT} />
          </Field>
        </div>
      </Section>

      {/* Dimensions */}
      <Section title="Dimensions & Weights" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Length">
            <input type="number" step="any" {...register("length", { valueAsNumber: true })} placeholder="cm" className={INPUT} />
          </Field>
          <Field label="Breadth">
            <input type="number" step="any" {...register("breadth", { valueAsNumber: true })} placeholder="cm" className={INPUT} />
          </Field>
          <Field label="Height">
            <input type="number" step="any" {...register("height", { valueAsNumber: true })} placeholder="cm" className={INPUT} />
          </Field>
          <Field label="Gross Weight">
            <input type="number" step="any" {...register("grossWeight", { valueAsNumber: true })} placeholder="kg" className={INPUT} />
          </Field>
          <Field label="Net Weight">
            <input type="number" step="any" {...register("netWeight", { valueAsNumber: true })} placeholder="kg" className={INPUT} />
          </Field>
        </div>
      </Section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#6d28d9] px-5 py-2 text-sm font-medium text-white hover:bg-[#5b21b6] disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : isEdit ? "Update Item" : "Create Item"}
        </button>
      </div>
    </form>
  );
}
