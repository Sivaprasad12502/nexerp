"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  type FieldError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Loader2,
  Building2,
  Package,
  FileText,
  Image as ImageIcon,
  Layers,
  Settings2,
  Pen,
} from "lucide-react";

import { uploadFile } from "@/lib/upload";
import {
  quotationCreateSchema,
  type QuotationCreateInput,
  type QuotationSettings,
} from "@/lib/validations/quotation";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";
import { Modal } from "@/components/ui/modal";
import {
  ClientForm,
  type ClientRow,
} from "../../clients-prospects/components/client-form";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ClientBasic = { id: string; businessName: string; logo: string | null };

type ProductBasic = {
  id: string;
  name: string;
  sku: string | null;
  hsnSac: string | null;
  unit: string | null;
  sellingPrice: number | null;
  taxRate: number | null;
  description: string | null;
  image: string | null;
};

type WarehouseBasic = {
  id: string;
  name: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

export type QuotationRow = {
  id: string;
  quotationTitle: string;
  quotationNumber: string;
  quotationDate: string;
  validTillDate: string | null;
  subtitle: string | null;
  logo: string | null;
  currency: string;
  fromName: string | null;
  fromAddress: string | null;
  fromGstin: string | null;
  fromPan: string | null;
  clientId: string | null;
  clientName: string | null;
  clientAddress: string | null;
  clientGstin: string | null;
  showShipping?: boolean;
  shipFromWarehouseId: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingPostalCode: string | null;
  shippingState: string | null;
  transporterName: string | null;
  distance: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  transportDocNumber: string | null;
  transactionType: string | null;
  discountLabel: string | null;
  discountAmount: number;
  additionalCharges: { label: string; amount: number }[];
  subTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalQuantity: number;
  totalAmount: number;
  amountInWords: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  signature: string | null;
  additionalInfo: string | null;
  contactDetails: string | null;
  attachments: string[];
  customFields: { label: string; value: string }[];
  settings: QuotationSettings;
  status: "DRAFT" | "SAVED" | "CANCELLED";
  items: {
    id: string;
    productId: string | null;
    name: string;
    sku: string | null;
    hsnSac: string | null;
    unit: string | null;
    description: string | null;
    image: string | null;
    groupName: string | null;
    quantity: number;
    rate: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    amount: number;
    total: number;
    sortOrder: number;
  }[];
};

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "h-9 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors";
const selectCls =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#7438dc] transition-colors";
const numInputCls =
  "h-9 w-full rounded-md border border-zinc-200 px-2 text-right text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors";
const labelCls = "block text-xs font-medium text-zinc-600 mb-1";

const CURRENCIES = [
  "AED",
  "INR",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
];

// ─── Main Component ────────────────────────────────────────────────────────────

export function QuotationForm({
  initialData,
  onCancel,
  onSaved,
}: {
  initialData?: QuotationRow | null;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const isEdit = !!initialData;
  const qc = useQueryClient();

  // ── State ──
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [showShipping, setShowShipping] = useState(
    initialData?.shipFromWarehouseId ? true : false,
  );
  const [showSubtitle, setShowSubtitle] = useState(!!initialData?.subtitle);
  const [showCustomFields, setShowCustomFields] = useState(
    (initialData?.customFields?.length ?? 0) > 0,
  );
  const [showDiscount, setShowDiscount] = useState(
    (initialData?.discountAmount ?? 0) > 0,
  );
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(
    (initialData?.additionalCharges?.length ?? 0) > 0,
  );
  const [showTotalInWords, setShowTotalInWords] = useState(
    !!initialData?.amountInWords,
  );
  const [showTerms, setShowTerms] = useState(!!initialData?.termsAndConditions);
  const [showNotes, setShowNotes] = useState(!!initialData?.notes);
  const [showSignature, setShowSignature] = useState(!!initialData?.signature);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(
    !!initialData?.additionalInfo,
  );
  const [showContactDetails, setShowContactDetails] = useState(
    !!initialData?.contactDetails,
  );
  const [showAttachments, setShowAttachments] = useState(
    (initialData?.attachments?.length ?? 0) > 0,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<number, string>>(
    {},
  );
  const [productDropdown, setProductDropdown] = useState<number | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  // ── Form ──
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuotationCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(quotationCreateSchema) as any,
    defaultValues: initialData
      ? {
          quotationTitle: initialData.quotationTitle,
          quotationNumber: initialData.quotationNumber,
          quotationDate: initialData.quotationDate
            ? new Date(initialData.quotationDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          validTillDate: initialData.validTillDate
            ? new Date(initialData.validTillDate).toISOString().split("T")[0]
            : "",
          subtitle: initialData.subtitle ?? "",
          logo: initialData.logo ?? "",
          currency: initialData.currency || "AED",
          fromName: initialData.fromName ?? "",
          fromAddress: initialData.fromAddress ?? "",
          fromGstin: initialData.fromGstin ?? "",
          fromPan: initialData.fromPan ?? "",
          clientId: initialData.clientId ?? "",
          clientName: initialData.clientName ?? "",
          clientAddress: initialData.clientAddress ?? "",
          clientGstin: initialData.clientGstin ?? "",
          shipFromWarehouseId: initialData.shipFromWarehouseId ?? "",
          shippingName: initialData.shippingName ?? "",
          shippingAddress: initialData.shippingAddress ?? "",
          shippingPostalCode: initialData.shippingPostalCode ?? "",
          shippingState: initialData.shippingState ?? "",
          transporterName: initialData.transporterName ?? "",
          distance: initialData.distance ?? "",
          vehicleType: initialData.vehicleType ?? "",
          vehicleNumber: initialData.vehicleNumber ?? "",
          transportDocNumber: initialData.transportDocNumber ?? "",
          transactionType: initialData.transactionType ?? "",
          discountLabel: initialData.discountLabel ?? "",
          discountAmount: initialData.discountAmount ?? 0,
          additionalCharges: initialData.additionalCharges ?? [],
          termsAndConditions: initialData.termsAndConditions ?? "",
          notes: initialData.notes ?? "",
          signature: initialData.signature ?? "",
          additionalInfo: initialData.additionalInfo ?? "",
          contactDetails: initialData.contactDetails ?? "",
          attachments: initialData.attachments ?? [],
          customFields: (initialData.customFields ?? []).map((cf) => ({
            label: cf.label,
            value: cf.value,
          })),
          settings: initialData.settings ?? {},
          status: initialData.status ?? "DRAFT",
          items: initialData.items.map((item) => ({
            productId: item.productId ?? "",
            name: item.name,
            sku: item.sku ?? "",
            hsnSac: item.hsnSac ?? "",
            unit: item.unit ?? "",
            description: item.description ?? "",
            image: item.image ?? "",
            groupName: item.groupName ?? "",
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            amount: item.amount,
            total: item.total,
            sortOrder: item.sortOrder,
          })),
        }
      : {
          quotationTitle: "",
          quotationNumber: "",
          quotationDate: new Date().toISOString().split("T")[0],
          validTillDate: "",
          currency: "AED",
          fromName: "",
          fromAddress: "",
          fromGstin: "",
          fromPan: "",
          clientId: "",
          discountAmount: 0,
          additionalCharges: [],
          customFields: [],
          attachments: [],
          settings: {},
          status: "DRAFT",
          items: [
            {
              productId: "",
              name: "",
              sku: "",
              hsnSac: "",
              unit: "",
              description: "",
              image: "",
              groupName: "",
              quantity: 1,
              rate: 0,
              discount: 0,
              taxRate: 0,
              taxAmount: 0,
              amount: 0,
              total: 0,
              sortOrder: 0,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const {
    fields: chargeFields,
    append: appendCharge,
    remove: removeCharge,
  } = useFieldArray({ control, name: "additionalCharges" });
  const {
    fields: cfFields,
    append: appendCf,
    remove: removeCf,
  } = useFieldArray({ control, name: "customFields" });

  // ── Watch values for live calculation ──
  const watchedItems = watch("items");
  const watchedDiscount = watch("discountAmount") ?? 0;
  const watchedCharges = watch("additionalCharges") ?? [];
  const watchedCurrency = watch("currency") ?? "AED";
  const title = watch("quotationTitle");

  const additionalChargesTotal = watchedCharges.reduce(
    (s, c) => s + (Number(c.amount) || 0),
    0,
  );
  const totals = calcTotals({
    items: watchedItems ?? [],
    discountAmount: Number(watchedDiscount) || 0,
    additionalCharges: additionalChargesTotal,
  });

  // Recompute each item's derived fields on watch changes
  const updateItemCalc = useCallback(
    (idx: number) => {
      const items = getValues("items");
      const item = items[idx];
      if (!item) return;
      const { amount, taxAmount, total } = calcItem({
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discount: Number(item.discount) || 0,
        taxRate: Number(item.taxRate) || 0,
      });
      setValue(`items.${idx}.amount`, amount, { shouldDirty: false });
      setValue(`items.${idx}.taxAmount`, taxAmount, { shouldDirty: false });
      setValue(`items.${idx}.total`, total, { shouldDirty: false });
    },
    [getValues, setValue],
  );

  // ── Data fetches ──
  const { data: clientsData } = useQuery<{ clients: ClientBasic[] }>({
    queryKey: ["clients", "ACTIVE"],
    queryFn: () => fetch("/api/clients?status=ACTIVE").then((r) => r.json()),
  });

  const { data: productsData } = useQuery<{ products: ProductBasic[] }>({
    queryKey: ["products", "ACTIVE"],
    queryFn: () => fetch("/api/products?status=ACTIVE").then((r) => r.json()),
  });

  const { data: warehousesData } = useQuery<{ warehouses: WarehouseBasic[] }>({
    queryKey: ["warehouses"],
    queryFn: () => fetch("/api/warehouses").then((r) => r.json()),
  });

  const clients = clientsData?.clients ?? [];
  const products = productsData?.products ?? [];
  const warehouses = warehousesData?.warehouses ?? [];

  // ── Mutations ──
  const save = useMutation({
    mutationFn: async (payload: QuotationCreateInput) => {
      const url = isEdit
        ? `/api/quotations/${initialData!.id}`
        : "/api/quotations";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          body.error?.items?.[0] ?? body.error ?? "Failed to save",
        );
      return body;
    },
    onSuccess: (body) => {
      toast.success(isEdit ? "Quotation updated" : "Quotation created");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      onSaved(body.quotation.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (status: "DRAFT" | "SAVED") =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleSubmit((data) => save.mutate({ ...(data as any), status }))();

  // ── Logo upload ──
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("logo", url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  // ── Signature upload ──
  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureUploading(true);
    try {
      const url = await uploadFile(file);
      setValue("signature", url);
      toast.success("Signature uploaded");
    } catch {
      toast.error("Signature upload failed");
    } finally {
      setSignatureUploading(false);
    }
  };

  // ── Attachment upload ──
  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachmentUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadFile));
      const existing = getValues("attachments") ?? [];
      setValue("attachments", [...existing, ...urls]);
      toast.success(`${urls.length} attachment(s) added`);
    } catch {
      toast.error("Attachment upload failed");
    } finally {
      setAttachmentUploading(false);
    }
  };

  // ── Product select ──
  const handleProductSelect = (idx: number, product: ProductBasic) => {
    setValue(`items.${idx}.productId`, product.id);
    setValue(`items.${idx}.name`, product.name);
    setValue(`items.${idx}.sku`, product.sku ?? "");
    setValue(`items.${idx}.hsnSac`, product.hsnSac ?? "");
    setValue(`items.${idx}.unit`, product.unit ?? "");
    setValue(`items.${idx}.rate`, product.sellingPrice ?? 0);
    setValue(`items.${idx}.taxRate`, product.taxRate ?? 0);
    setValue(`items.${idx}.description`, product.description ?? "");
    setValue(`items.${idx}.image`, product.image ?? "");
    setProductSearch((prev) => ({ ...prev, [idx]: product.name }));
    setProductDropdown(null);
    updateItemCalc(idx);
  };

  // ── Client select ──
  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setValue("clientId", clientId);
    setValue("clientName", client?.businessName ?? "");
  };

  // ── Warehouse select → auto-fill shipping address ──
  const handleWarehouseSelect = (warehouseId: string) => {
    setValue("shipFromWarehouseId", warehouseId);
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (wh) {
      const addr = [wh.streetAddress, wh.city, wh.state, wh.postalCode]
        .filter(Boolean)
        .join(", ");
      setValue("shippingAddress", addr);
      setValue("shippingPostalCode", wh.postalCode ?? "");
      setValue("shippingState", wh.state ?? "");
    }
  };

  // ── Filtered product list by search ──
  const getFilteredProducts = (idx: number) => {
    const q = (productSearch[idx] ?? "").toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.hsnSac ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  };

  const watchedLogo = watch("logo");
  const watchedSignature = watch("signature");
  const watchedAttachments = watch("attachments") ?? [];

  return (
    <div className="bg-zinc-50 pb-32">
      {/* ── New Client Modal ── */}
      <Modal
        open={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        title="Add New Client"
        size="xl"
      >
        <ClientForm
          onCancel={() => setNewClientModalOpen(false)}
          onSaved={(id) => {
            setNewClientModalOpen(false);
            qc.invalidateQueries({ queryKey: ["clients"] });
            // After invalidation, select the new client
            setTimeout(() => {
              const newClient = clientsData?.clients?.find((c) => c.id === id);
              if (newClient) {
                setValue("clientId", newClient.id);
                setValue("clientName", newClient.businessName);
              } else {
                setValue("clientId", id);
              }
            }, 600);
          }}
        />
      </Modal>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {/* ═══════════════════════════════════════════════
            SECTION 1 — HEADER
        ═══════════════════════════════════════════════ */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: title + meta fields */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  {...register("quotationTitle")}
                  autoFocus
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setIsEditing(false);
                    }
                  }}
                  className="w-full text-center mb-4 h-auto border-0 bg-transparent p-0 text-2xl font-semibold shadow-none focus-visible:ring-0 outline-none"
                />
              ) : (
                <h2
                  onClick={() => setIsEditing(true)}
                  className="cursor-text mb-4 text-2xl font-semibold text-zinc-950 text-center"
                >
                  {title || "Quotation"}
                </h2>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Quotation No */}
                <div>
                  <label className={labelCls}>Quotation No.</label>
                  <input
                    {...register("quotationNumber")}
                    placeholder="e.g. QT-0001 (auto)"
                    className={inputCls}
                  />
                </div>
                {/* Quotation Date */}
                <div>
                  <label className={labelCls}>Quotation Date</label>
                  <input
                    {...register("quotationDate")}
                    type="date"
                    className={inputCls}
                  />
                </div>
                {/* Valid Till */}
                <div>
                  <label className={labelCls}>Valid Till Date</label>
                  <input
                    {...register("validTillDate")}
                    type="date"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Subtitle */}
              {showSubtitle ? (
                <div className="mt-3">
                  <label className={labelCls}>Subtitle</label>
                  <input
                    {...register("subtitle")}
                    placeholder="Subtitle…"
                    className={inputCls}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubtitle(true)}
                  className="mt-3 flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3.5" /> Add Subtitle
                </button>
              )}

              {/* Custom fields */}
              {showCustomFields && (
                <div className="mt-4 space-y-2">
                  {cfFields.map((cf, i) => (
                    <div key={cf.id} className="flex gap-2">
                      <input
                        {...register(`customFields.${i}.label`)}
                        placeholder="Field label"
                        className={inputCls}
                      />
                      <input
                        {...register(`customFields.${i}.value`)}
                        placeholder="Value"
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeCf(i)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendCf({ label: "", value: "" })}
                    className="flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
                  >
                    <Plus className="size-3.5" /> Add Field
                  </button>
                </div>
              )}
              {!showCustomFields && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomFields(true);
                    appendCf({ label: "", value: "" });
                  }}
                  className="mt-2 flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3.5" /> Add Custom Fields
                </button>
              )}
            </div>

            {/* Right: business logo */}
            <div className="flex-shrink-0">
              <p className={labelCls}>Business Logo</p>
              {watchedLogo ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={watchedLogo}
                    alt="Business logo"
                    className="h-20 w-32 rounded-lg border border-zinc-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setValue("logo", "")}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200 hover:bg-red-50"
                  >
                    <X className="size-3 text-zinc-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={logoUploading}
                  className="flex h-20 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-200 text-zinc-400 transition-colors hover:border-[#7438dc] hover:text-[#7438dc]"
                >
                  {logoUploading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-5" />
                      <span className="text-xs">PNG or JPG</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 2 — QUOTATION FROM / FOR
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* FROM */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="size-4 text-zinc-400" />
              <h3 className="font-medium text-zinc-950">Quotation From</h3>
              <span className="text-xs text-zinc-400">(Your Details)</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Business Name</label>
                <input
                  {...register("fromName")}
                  placeholder="Your business name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <textarea
                  {...register("fromAddress")}
                  placeholder="Full address"
                  rows={2}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input
                    {...register("fromGstin")}
                    placeholder="GST number"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>PAN</label>
                  <input
                    {...register("fromPan")}
                    placeholder="PAN number"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FOR */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="size-4 text-zinc-400" />
              <h3 className="font-medium text-zinc-950">Quotation For</h3>
              <span className="text-xs text-zinc-400">
                (Client&apos;s Details)
              </span>
            </div>

            {/* Client picker */}
            <div>
              <label className={labelCls}>Select a Client</label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <select
                    value={field.value ?? ""}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-xs text-zinc-400">OR</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>

            <button
              type="button"
              onClick={() => setNewClientModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7438dc] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6330c2] transition-colors"
            >
              <Plus className="size-4" /> Add New Client
            </button>

            {/* Client address preview */}
            {watch("clientId") && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelCls}>Client Address</label>
                  <textarea
                    {...register("clientAddress")}
                    placeholder="Client address"
                    rows={2}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc] transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className={labelCls}>Client GSTIN / TRN</label>
                  <input
                    {...register("clientGstin")}
                    placeholder="Tax number"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 3 — SHIPPING & TRANSPORT
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
          <label className="flex cursor-pointer items-center gap-3 px-6 py-4">
            <input
              type="checkbox"
              checked={showShipping}
              onChange={(e) => setShowShipping(e.target.checked)}
              className="size-4 rounded border-zinc-300 accent-[#7438dc]"
            />
            <span className="text-sm font-medium text-zinc-800">
              Add Shipping Details
            </span>
          </label>

          {showShipping && (
            <div className="border-t border-zinc-100 px-6 pb-6">
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Warehouse */}
                <div>
                  <label className={labelCls}>Ship From (Warehouse)</label>
                  <select
                    value={watch("shipFromWarehouseId") ?? ""}
                    onChange={(e) => handleWarehouseSelect(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Select warehouse —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Shipping Name</label>
                  <input
                    {...register("shippingName")}
                    placeholder="Ship to name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Shipping Address</label>
                  <input
                    {...register("shippingAddress")}
                    placeholder="Full shipping address"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input
                    {...register("shippingPostalCode")}
                    placeholder="Postal code"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input
                    {...register("shippingState")}
                    placeholder="State / Emirate"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Transport Details
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelCls}>Transporter</label>
                    <input
                      {...register("transporterName")}
                      placeholder="Transporter name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Distance</label>
                    <input
                      {...register("distance")}
                      placeholder="e.g. 50 km"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle Type</label>
                    <input
                      {...register("vehicleType")}
                      placeholder="e.g. Truck"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle Number</label>
                    <input
                      {...register("vehicleNumber")}
                      placeholder="Vehicle reg. number"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transport Doc. No.</label>
                    <input
                      {...register("transportDocNumber")}
                      placeholder="LR / consignment no."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transaction Type</label>
                    <input
                      {...register("transactionType")}
                      placeholder="e.g. Supply"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 4 — TOOLBAR (currency + configure TAX)
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white px-6 py-3 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-center gap-2">
            <label className={`${labelCls} mb-0`}>Currency</label>
            <select
              {...register("currency")}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-[#7438dc]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 cursor-default select-none">
              Configure TAX
            </span>
            <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 cursor-default select-none">
              Number &amp; Currency Format
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 5 — ITEMS TABLE
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 overflow-hidden">
          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="bg-[#7438DC] border-b border-zinc-100">
                <tr>
                  <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-white">
                    #. Item Name / SKU
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    TAX Rate
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    Qty
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-white">
                    Unit
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    Rate
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    Amount
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    TAX
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    Total
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-white">
                    Disc.
                  </th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-50">
                {fields.map((field, idx) => (
                  <ItemRow
                    key={field.id}
                    idx={idx}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    currency={watchedCurrency}
                    products={products}
                    filteredProducts={getFilteredProducts(idx)}
                    productSearch={productSearch[idx] ?? ""}
                    onProductSearch={(q) =>
                      setProductSearch((prev) => ({ ...prev, [idx]: q }))
                    }
                    dropdownOpen={productDropdown === idx}
                    onDropdownOpen={() => setProductDropdown(idx)}
                    onDropdownClose={() => setProductDropdown(null)}
                    onProductSelect={(p) => handleProductSelect(idx, p)}
                    onCalcUpdate={() => updateItemCalc(idx)}
                    onRemove={() => remove(idx)}
                    canRemove={fields.length > 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row buttons */}
          <div className="flex flex-wrap gap-3 border-t border-zinc-100 px-4 py-3">
            <button
              type="button"
              onClick={() =>
                append({
                  productId: "",
                  name: "",
                  sku: "",
                  hsnSac: "",
                  unit: "",
                  description: "",
                  image: "",
                  groupName: "",
                  quantity: 1,
                  rate: 0,
                  discount: 0,
                  taxRate: 0,
                  taxAmount: 0,
                  amount: 0,
                  total: 0,
                  sortOrder: fields.length,
                })
              }
              className="flex items-center gap-1.5 rounded-md bg-[#7438dc]/10 px-3 py-1.5 text-sm font-medium text-[#7438dc] hover:bg-[#7438dc]/20 transition-colors"
            >
              <Plus className="size-4" /> Add New Line
            </button>
            <button
              type="button"
              onClick={() => {
                const groupName = prompt("Enter group name:");
                if (!groupName) return;
                append({
                  productId: "",
                  name: "— Group: " + groupName,
                  sku: "",
                  hsnSac: "",
                  unit: "",
                  description: "",
                  image: "",
                  groupName,
                  quantity: 0,
                  rate: 0,
                  discount: 0,
                  taxRate: 0,
                  taxAmount: 0,
                  amount: 0,
                  total: 0,
                  sortOrder: fields.length,
                });
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-[#7438dc] hover:text-[#7438dc] transition-colors"
            >
              <Layers className="size-4" /> Add New Group
            </button>
          </div>

          {errors.items &&
            typeof errors.items === "object" &&
            "message" in errors.items && (
              <p className="px-4 pb-3 text-xs text-red-500">
                {(errors.items as FieldError).message}
              </p>
            )}
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 6 — TOTALS SIDEBAR
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 space-y-3">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Amount</span>
              <span className="font-medium text-zinc-950">
                {watchedCurrency} {totals.subTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-zinc-600">
              <span>TAX</span>
              <span className="font-medium text-zinc-950">
                {watchedCurrency} {totals.totalTax.toFixed(2)}
              </span>
            </div>

            {/* Discount toggle */}
            {showDiscount ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    {...register("discountLabel")}
                    placeholder="Discount label"
                    className="h-8 flex-1 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-[#7438dc]"
                  />
                  <input
                    {...register("discountAmount", { valueAsNumber: true })}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className="h-8 w-24 rounded-md border border-zinc-200 px-2 text-right text-sm outline-none focus:border-[#7438dc]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscount(false);
                      setValue("discountAmount", 0);
                      setValue("discountLabel", "");
                    }}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDiscount(true)}
                className="flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-3.5" /> Add Discounts
              </button>
            )}

            {/* Additional charges */}
            {showAdditionalCharges ? (
              <div className="space-y-1.5">
                {chargeFields.map((cf, i) => (
                  <div key={cf.id} className="flex items-center gap-2">
                    <input
                      {...register(`additionalCharges.${i}.label`)}
                      placeholder="Charge label"
                      className="h-8 flex-1 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-[#7438dc]"
                    />
                    <input
                      {...register(`additionalCharges.${i}.amount`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className="h-8 w-24 rounded-md border border-zinc-200 px-2 text-right text-sm outline-none focus:border-[#7438dc]"
                    />
                    <button
                      type="button"
                      onClick={() => removeCharge(i)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    appendCharge({ label: "Additional Charge", amount: 0 })
                  }
                  className="flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
                >
                  <Plus className="size-3.5" /> Add Charge
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowAdditionalCharges(true);
                  appendCharge({ label: "Additional Charge", amount: 0 });
                }}
                className="flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-3.5" /> Add Additional Charges
              </button>
            )}

            <div className="border-t border-zinc-100 pt-3">
              <div className="flex justify-between text-base font-semibold text-zinc-950">
                <span>Total ({watchedCurrency})</span>
                <span>
                  {watchedCurrency} {totals.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-zinc-500">
                <span>Total Qty</span>
                <span>{totals.totalQuantity}</span>
              </div>
            </div>

            {/* Amount in words */}
            {showTotalInWords ? (
              <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 italic">
                {numberToWords(totals.totalAmount, watchedCurrency)}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTotalInWords(true)}
                className="flex items-center gap-1 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-3.5" /> Show Total in Words
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 7 — EXTRAS
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Terms & Conditions */}
          <div className="rounded-xl bg-white p-5 shadow-sm border-2 border-dotted">
            {showTerms ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Terms &amp; Conditions
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTerms(false);
                      setValue("termsAndConditions", "");
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                <textarea
                  {...register("termsAndConditions")}
                  rows={4}
                  placeholder="Enter terms and conditions…"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Terms &amp; Conditions
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl bg-white p-5 shadow-sm border-2 border-dotted">
            {showNotes ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Notes
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotes(false);
                      setValue("notes", "");
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                <textarea
                  {...register("notes")}
                  rows={4}
                  placeholder="Additional notes…"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Notes
              </button>
            )}
          </div>

          {/* Signature */}
          <div className="rounded-xl bg-white p-5 shadow-sm  border-2 border-dotted ">
            {showSignature ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Signature
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignature(false);
                      setValue("signature", "");
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                {watchedSignature ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={watchedSignature}
                      alt="Signature"
                      className="h-16 rounded-md border border-zinc-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setValue("signature", "")}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200"
                    >
                      <X className="size-3 text-zinc-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => signatureRef.current?.click()}
                    disabled={signatureUploading}
                    className="flex h-16 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-200 text-sm text-zinc-400 hover:border-[#7438dc] hover:text-[#7438dc]"
                  >
                    {signatureUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Pen className="size-4" /> Upload signature
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={signatureRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowSignature(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Signature
              </button>
            )}
          </div>

          {/* Additional Info */}
          <div className="rounded-xl bg-white p-5 shadow-sm border-2 border-dotted">
            {showAdditionalInfo ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Additional Information
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdditionalInfo(false);
                      setValue("additionalInfo", "");
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                <textarea
                  {...register("additionalInfo")}
                  rows={3}
                  placeholder="Any additional info…"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdditionalInfo(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Additional Info
              </button>
            )}
          </div>

          {/* Contact Details */}
          <div className="rounded-xl bg-white p-5 shadow-sm border-2 border-dotted">
            {showContactDetails ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Contact Details
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactDetails(false);
                      setValue("contactDetails", "");
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                <textarea
                  {...register("contactDetails")}
                  rows={3}
                  placeholder="Contact details to show on quotation…"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowContactDetails(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Contact Details
              </button>
            )}
          </div>

          {/* Attachments */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            {showAttachments ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Attachments
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachments(false);
                      setValue("attachments", []);
                    }}
                  >
                    <X className="size-4 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
                <div className="space-y-1.5 mb-2">
                  {watchedAttachments.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-zinc-600"
                    >
                      <FileText className="size-3.5 flex-shrink-0 text-zinc-400" />
                      <span className="truncate flex-1">
                        {url.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = getValues("attachments") ?? [];
                          setValue(
                            "attachments",
                            current.filter((_, j) => j !== i),
                          );
                        }}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => attachmentRef.current?.click()}
                  disabled={attachmentUploading}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-[#7438dc] hover:text-[#7438dc]"
                >
                  {attachmentUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-4" /> Upload files
                    </>
                  )}
                </button>
                <input
                  ref={attachmentRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAttachments(true)}
                className="flex items-center gap-2 text-sm text-[#7438dc] hover:underline"
              >
                <Plus className="size-4" /> Add Attachments
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 8 — ADVANCED OPTIONS
        ═══════════════════════════════════════════════ */}
        <div className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-zinc-400" />
              Advanced Options
            </div>
            {showAdvanced ? (
              <ChevronUp className="size-4 text-zinc-400" />
            ) : (
              <ChevronDown className="size-4 text-zinc-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="border-t border-zinc-100 px-6 pb-6">
              <p className="mt-4 mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Display unit as
              </p>
              <Controller
                control={control}
                name="settings.displayUnitAs"
                render={({ field }) => (
                  <select {...field} className={`${selectCls} max-w-xs`}>
                    <option value="mergeWithQuantity">
                      Merge with Quantity
                    </option>
                    <option value="mergeWithName">Merge with Name</option>
                    <option value="doNotShow">Do not show</option>
                  </select>
                )}
              />

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ["showTaxSummary", "Show Tax Summary in Invoice"],
                  ["hideCountryOfSupply", "Hide Country of Supply"],
                  ["addOriginalImages", "Add Original Images in Line Items"],
                  ["showThumbnails", "Show Thumbnails in Separate Column"],
                  [
                    "showFullWidthDescription",
                    "Show Description in Full Width",
                  ],
                  ["hideSubtotalForGroups", "Hide Subtotal for Group Items"],
                  ["showSku", "Show SKU in Quotation"],
                  ["showSerialNumbers", "Show Serial Numbers in Quotation"],
                  ["showBatchDetails", "Display Batch Details in Quotation"],
                  ["showHsnSummary", "Show HSN Summary"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 hover:bg-zinc-50"
                  >
                    <Controller
                      control={control}
                      name={`settings.${key as keyof QuotationSettings}`}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="size-4 rounded border-zinc-300 accent-[#7438dc]"
                        />
                      )}
                    />
                    <span className="text-sm text-zinc-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          SAVE BAR (sticky bottom)
      ═══════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-100 bg-white px-6 py-3 shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {/* Deferred action placeholder */}
            <button
              type="button"
              disabled
              title="Coming soon"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-400 cursor-not-allowed"
            >
              Save &amp; Credit Note
            </button>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={save.isPending || logoUploading || signatureUploading}
              className="flex items-center gap-2 rounded-lg border border-[#7438dc] px-4 py-2 text-sm font-medium text-[#7438dc] hover:bg-[#7438dc]/5 transition-colors disabled:opacity-50"
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Save As Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave("SAVED")}
              disabled={save.isPending || logoUploading || signatureUploading}
              className="flex items-center gap-2 rounded-lg bg-[#7438dc] px-4 py-2 text-sm font-medium text-white hover:bg-[#6330c2] transition-colors disabled:opacity-50"
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Save &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ItemRow sub-component ────────────────────────────────────────────────────

function ItemRow({
  idx,
  register,
  watch,
  setValue,
  errors,
  currency,
  products,
  filteredProducts,
  productSearch,
  onProductSearch,
  dropdownOpen,
  onDropdownOpen,
  onDropdownClose,
  onProductSelect,
  onCalcUpdate,
  onRemove,
  canRemove,
}: {
  idx: number;
  register: ReturnType<typeof useForm<QuotationCreateInput>>["register"];
  watch: ReturnType<typeof useForm<QuotationCreateInput>>["watch"];
  setValue: ReturnType<typeof useForm<QuotationCreateInput>>["setValue"];
  errors: ReturnType<
    typeof useForm<QuotationCreateInput>
  >["formState"]["errors"];
  currency: string;
  products: ProductBasic[];
  filteredProducts: ProductBasic[];
  productSearch: string;
  onProductSearch: (q: string) => void;
  dropdownOpen: boolean;
  onDropdownOpen: () => void;
  onDropdownClose: () => void;
  onProductSelect: (p: ProductBasic) => void;
  onCalcUpdate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [showDescription, setShowDescription] = useState(false);
  const [showItemImage, setShowItemImage] = useState(false);
  const [showUnit, setShowUnit] = useState(false);
  const [itemImageUploading, setItemImageUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const itemErrors = (errors.items as Record<string, unknown>[] | undefined)?.[
    idx
  ] as Record<string, { message?: string }> | undefined;

  const amount = watch(`items.${idx}.amount`) ?? 0;
  const taxAmount = watch(`items.${idx}.taxAmount`) ?? 0;
  const total = watch(`items.${idx}.total`) ?? 0;
  const itemImage = watch(`items.${idx}.image`);
  const groupName = watch(`items.${idx}.groupName`);

  // Group row — render differently
  if (groupName) {
    return (
      <tr className="bg-zinc-50">
        <td colSpan={10} className="py-2 pl-4 pr-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {groupName}
            </span>
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-zinc-300 hover:text-red-400"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setItemImageUploading(true);
    try {
      const url = await uploadFile(file);
      setValue(`items.${idx}.image`, url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setItemImageUploading(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-zinc-50/50">
        {/* Item Name + product search */}
        <td className="py-2 pl-4 pr-2">
          <div className="flex items-center gap-1 text-xs text-zinc-400 mb-1">
            <span>{idx + 1}.</span>
          </div>
          <div className="relative">
            <input
              value={productSearch}
              onChange={(e) => {
                onProductSearch(e.target.value);
                setValue(`items.${idx}.name`, e.target.value);
                setValue(`items.${idx}.productId`, "");
                onDropdownOpen();
              }}
              onFocus={onDropdownOpen}
              onBlur={() => setTimeout(onDropdownClose, 200)}
              placeholder="Item name / search product"
              className={`${inputCls} pr-7`}
            />
            <Package className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-300 pointer-events-none" />
            {dropdownOpen && filteredProducts.length > 0 && (
              <div className="absolute left-0 top-full z-30 mt-0.5 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => onProductSelect(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">{p.name}</div>
                      {p.sku && (
                        <div className="text-xs text-zinc-400">
                          SKU: {p.sku}
                        </div>
                      )}
                    </div>
                    {p.sellingPrice !== null && (
                      <div className="text-xs font-medium text-zinc-600">
                        {currency} {p.sellingPrice}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {itemErrors?.name?.message && (
            <p className="mt-0.5 text-xs text-red-500">
              {itemErrors.name.message}
            </p>
          )}
          {/* Row extras */}
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-[#7438dc]"
            >
              <Plus className="size-3" />
              {showDescription ? "Hide" : "Add"} Description
            </button>
            <button
              type="button"
              onClick={() => setShowItemImage((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-[#7438dc]"
            >
              <ImageIcon className="size-3" />
              {showItemImage ? "Hide" : "Add"} Image
            </button>
            <button
              type="button"
              onClick={() => setShowUnit((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-[#7438dc]"
            >
              <Plus className="size-3" />
              {showUnit ? "Hide" : "Add"} Unit
            </button>
          </div>
          {showDescription && (
            <input
              {...register(`items.${idx}.description`)}
              placeholder="Item description"
              className={`${inputCls} mt-1.5 text-xs`}
            />
          )}
          {showItemImage && (
            <div className="mt-1.5 flex items-center gap-2">
              {itemImage ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemImage}
                    alt="Item"
                    className="h-10 w-10 rounded object-cover border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setValue(`items.${idx}.image`, "")}
                    className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200"
                  >
                    <X className="size-2.5 text-zinc-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageRef.current?.click()}
                  disabled={itemImageUploading}
                  className="flex h-10 w-10 items-center justify-center rounded border-2 border-dashed border-zinc-200 text-zinc-300 hover:border-[#7438dc] hover:text-[#7438dc]"
                >
                  {itemImageUploading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                </button>
              )}
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          )}
          {showUnit && (
            <div className="mt-1.5">
              <input
                {...register(`items.${idx}.unit`)}
                placeholder="Unit (e.g. kg, pcs)"
                className={`${inputCls} text-xs`}
              />
            </div>
          )}
        </td>

        {/* TAX Rate */}
        <td className="px-2 py-2">
          <input
            {...register(`items.${idx}.taxRate`, { valueAsNumber: true })}
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="0"
            onChange={(e) => {
              register(`items.${idx}.taxRate`, {
                valueAsNumber: true,
              }).onChange(e);
              setTimeout(onCalcUpdate, 0);
            }}
            className={numInputCls}
          />
          <div className="mt-0.5 text-center text-xs text-zinc-400">%</div>
        </td>

        {/* Quantity */}
        <td className="px-2 py-2">
          <input
            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
            type="number"
            min={0}
            step="0.001"
            placeholder="1"
            onChange={(e) => {
              register(`items.${idx}.quantity`, {
                valueAsNumber: true,
              }).onChange(e);
              setTimeout(onCalcUpdate, 0);
            }}
            className={numInputCls}
          />
        </td>

        {/* Unit */}
        <td className="px-2 py-2">
          <input
            {...register(`items.${idx}.unit`)}
            placeholder="pcs"
            className={inputCls}
          />
        </td>

        {/* Rate */}
        <td className="px-2 py-2">
          <input
            {...register(`items.${idx}.rate`, { valueAsNumber: true })}
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            onChange={(e) => {
              register(`items.${idx}.rate`, { valueAsNumber: true }).onChange(
                e,
              );
              setTimeout(onCalcUpdate, 0);
            }}
            className={numInputCls}
          />
        </td>

        {/* Amount (read-only computed) */}
        <td className="px-2 py-2 text-right text-sm text-zinc-700">
          {amount.toFixed(2)}
        </td>

        {/* TAX (read-only computed) */}
        <td className="px-2 py-2 text-right text-sm text-zinc-700">
          {taxAmount.toFixed(2)}
        </td>

        {/* Total (read-only computed) */}
        <td className="px-2 py-2 text-right text-sm font-medium text-zinc-900">
          {total.toFixed(2)}
        </td>

        {/* Discount */}
        <td className="px-2 py-2">
          <input
            {...register(`items.${idx}.discount`, { valueAsNumber: true })}
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            onChange={(e) => {
              register(`items.${idx}.discount`, {
                valueAsNumber: true,
              }).onChange(e);
              setTimeout(onCalcUpdate, 0);
            }}
            className={numInputCls}
          />
        </td>

        {/* Remove row */}
        <td className="px-2 py-2 text-center">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-zinc-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </td>
      </tr>

      {/* HSN / SKU row beneath if populated */}
      {(watch(`items.${idx}.hsnSac`) || watch(`items.${idx}.sku`)) && (
        <tr>
          <td colSpan={10} className="pb-2 pl-4 pr-2">
            <div className="flex gap-4 text-xs text-zinc-400">
              {watch(`items.${idx}.hsnSac`) && (
                <span>HSN/SAC: {watch(`items.${idx}.hsnSac`)}</span>
              )}
              {watch(`items.${idx}.sku`) && (
                <span>SKU: {watch(`items.${idx}.sku`)}</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
