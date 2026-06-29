"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, X, Plus } from "lucide-react";
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
  num,
  title,
  children,
  defaultOpen = false,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-200 bg-white last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-base font-semibold text-zinc-900">
          {num}. {title}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-zinc-500" />
        ) : (
          <ChevronDown className="size-4 text-zinc-500" />
        )}
      </button>
      {open && <div className="px-6 pb-6 pt-2">{children}</div>}
    </div>
  );
}

const INPUT =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-[#6d28d9] focus:outline-none focus:ring-1 focus:ring-[#6d28d9]";

export function ItemForm({ initialData, warehouses, onSave, onCancel }: Props) {
  const isEdit = !!initialData?.id;

  const imgInputRef = useRef<HTMLInputElement>(null);
  const origImgInputRef = useRef<HTMLInputElement>(null);

  const [imgPreview, setImgPreview] = useState<string | null>(initialData?.image ?? null);
  const [origImgPreview, setOrigImgPreview] = useState<string | null>(
    (initialData as ItemFormData & { originalImage?: string | null })?.originalImage ?? null,
  );
  const [imgUploading, setImgUploading] = useState(false);
  const [origImgUploading, setOrigImgUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [showDescription, setShowDescription] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showWeights, setShowWeights] = useState(false);

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

  async function handleOrigImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOrigImgPreview(URL.createObjectURL(file));
    setOrigImgUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("originalImage", url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setOrigImgUploading(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setValue("tags", [...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setValue(
      "tags",
      tags.filter((tag) => tag !== t),
    );
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSave as any)} className="rounded-md border border-zinc-200 bg-white mx-auto max-w-5xl">
      {/* ── Section 1: Item / Product Details ──────────────────────────── */}
      <Section num={1} title="Item/Product Details" defaultOpen>
        {/* Item Type */}
        <div className="mb-5">
          <p className="mb-2 text-sm text-zinc-600">Item Type</p>
          <div className="flex items-center gap-10">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("itemType")}
                value="PRODUCT"
                className="size-4 accent-[#6d28d9]"
              />
              <span className="text-sm text-zinc-800">Product</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("itemType")}
                value="SERVICE"
                className="size-4 accent-[#6d28d9]"
              />
              <span className="text-sm text-zinc-800">Service</span>
            </label>
          </div>
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm text-zinc-700">Category</label>
          <div className="relative">
            <input
              {...register("category")}
              placeholder="Select a Category"
              className={INPUT}
            />
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mb-5 space-y-3">
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...register("canBeSold")}
                className="size-3.5 rounded border-zinc-300 accent-[#6d28d9]"
              />
              <span className="text-sm text-zinc-800">This item can be sold to customers</span>
            </label>
            <p className="ml-[22px] mt-0.5 text-xs text-[#6d28d9]">
              Enable this for items that can be sold to external customers or clients.
            </p>
          </div>
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...register("manageStock")}
                className="size-3.5 rounded border-zinc-300 accent-[#6d28d9]"
              />
              <span className="text-sm text-zinc-800">Manage Stock</span>
            </label>
            <p className="ml-[22px] mt-0.5 text-xs text-[#6d28d9]">
              Track inventory levels for this item
            </p>
          </div>
        </div>

        {/* Item Images */}
        <div className="mb-4">
          <label className="mb-2 block text-sm text-zinc-700">Item Images</label>
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            disabled={imgUploading}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-400 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            {imgUploading ? "Uploading…" : "Upload Image"}
          </button>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imgPreview && (
            <img
              src={imgPreview}
              alt=""
              className="mt-2 size-16 rounded-md border border-zinc-200 object-cover"
            />
          )}
        </div>

        {/* Item Original Images */}
        <div className="mb-5">
          <label className="mb-2 block text-sm text-zinc-700">Item Original Images</label>
          <button
            type="button"
            onClick={() => origImgInputRef.current?.click()}
            disabled={origImgUploading}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-400 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            {origImgUploading ? "Uploading…" : "Upload Original Image"}
          </button>
          <input
            ref={origImgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleOrigImageChange}
          />
          {origImgPreview && (
            <img
              src={origImgPreview}
              alt=""
              className="mt-2 size-16 rounded-md border border-zinc-200 object-cover"
            />
          )}
        </div>

        {/* Item Name + SKU ID */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="Enter name of your item"
              className={INPUT}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">SKU ID</label>
            <input {...register("sku")} className={INPUT} />
          </div>
        </div>

        {/* Unit */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm text-zinc-700">Unit</label>
          <div className="relative w-60">
            <input
              {...register("unit")}
              placeholder="Select a quantity unit"
              className={INPUT}
            />
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        {/* Collapsible add-links row */}
        <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            className="flex items-center gap-0.5 hover:text-zinc-800"
          >
            <span className="mr-0.5 text-base leading-none">+</span> Add Description
          </button>
          <button
            type="button"
            onClick={() => setShowTags((v) => !v)}
            className="flex items-center gap-0.5 hover:text-zinc-800"
          >
            <span className="mr-0.5 text-base leading-none">+</span> Add Tags
          </button>
          <button type="button" className="flex items-center gap-0.5 hover:text-zinc-800">
            <span className="mr-0.5 text-base leading-none">+</span> Add Vendor Details
          </button>
          <button
            type="button"
            onClick={() => setShowDimensions((v) => !v)}
            className="flex items-center gap-0.5 hover:text-zinc-800"
          >
            <span className="mr-0.5 text-base leading-none">+</span> Add Dimensions
          </button>
          <button
            type="button"
            onClick={() => setShowWeights((v) => !v)}
            className="flex items-center gap-0.5 hover:text-zinc-800"
          >
            <span className="mr-0.5 text-base leading-none">+</span> Add Weights
          </button>
        </div>

        <div className="mb-1 text-sm text-zinc-500">
          <button type="button" className="flex items-center gap-0.5 hover:text-zinc-800">
            <span className="mr-0.5 text-base leading-none">+</span> Add Custom Fields
          </button>
        </div>

        {/* Expanded collapsible fields */}
        {showDescription && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Item description…"
              className={INPUT}
            />
          </div>
        )}

        {showTags && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className={INPUT}
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {showDimensions && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(
              [
                { label: "Length", field: "length" },
                { label: "Breadth", field: "breadth" },
                { label: "Height", field: "height" },
              ] as const
            ).map(({ label, field }) => (
              <div key={field}>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
                <input
                  type="number"
                  step="any"
                  {...register(field, { valueAsNumber: true })}
                  placeholder="cm"
                  className={INPUT}
                />
              </div>
            ))}
          </div>
        )}

        {showWeights && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                { label: "Gross Weight", field: "grossWeight" },
                { label: "Net Weight", field: "netWeight" },
              ] as const
            ).map(({ label, field }) => (
              <div key={field}>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
                <input
                  type="number"
                  step="any"
                  {...register(field, { valueAsNumber: true })}
                  placeholder="kg"
                  className={INPUT}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Section 2: Pricing & Taxation ───────────────────────────────── */}
      <Section num={2} title="Pricing & Taxation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Currency</label>
            <input {...register("currency")} placeholder="e.g. AED" className={INPUT} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Tax Rate (%)</label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("taxRate", { valueAsNumber: true })}
              placeholder="0"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Buying Price</label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("buyingPrice", { valueAsNumber: true })}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Selling Price</label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("sellingPrice", { valueAsNumber: true })}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Landed Cost</label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("landedCost", { valueAsNumber: true })}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            {...register("priceInclusiveTax")}
            className="size-3.5 rounded border-zinc-300 accent-[#6d28d9]"
          />
          Price inclusive of taxes
        </label>
      </Section>

      {/* ── Section 3: Stock Management ─────────────────────────────────── */}
      <Section num={3} title="Stock Management">
        {manageStock ? (
          <>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-zinc-700">Tracking Method</label>
                <select {...register("trackingMethod")} className={INPUT}>
                  <option value="NONE">None</option>
                  <option value="BATCHWISE">Batchwise</option>
                  <option value="SERIAL">Serial Number</option>
                  <option value="BATCH_SERIAL">Batch + Serial Number</option>
                </select>
              </div>
            </div>
            {!isEdit && warehouses.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-zinc-700">
                    Opening / Initial Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    {...register("initialStock", { valueAsNumber: true })}
                    placeholder="0"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-zinc-700">Warehouse</label>
                  <select {...register("initialWarehouseId")} className={INPUT}>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-400">
            Enable &quot;Manage Stock&quot; in section 1 to configure stock tracking.
          </p>
        )}
      </Section>

      {/* ── Section 4: Reorder & Overstock ──────────────────────────────── */}
      <Section num={4} title="Reorder & Overstock">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Reorder Point</label>
            <input
              type="number"
              min="0"
              {...register("reorderPoint", { valueAsNumber: true })}
              placeholder="e.g. 10"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-700">Overstock Point</label>
            <input
              type="number"
              min="0"
              {...register("overstockPoint", { valueAsNumber: true })}
              placeholder="e.g. 500"
              className={INPUT}
            />
          </div>
        </div>
      </Section>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : isEdit ? "Update Item" : "Save & Add Item"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
