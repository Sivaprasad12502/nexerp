"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Printer } from "lucide-react";

import { useDocument, type DocumentDetail } from "@/lib/hooks/use-documents";
import { QuotationPreview, type BusinessSettingsRow } from "../../quotation-estimates/components/quotation-preview";
import type { QuotationRow } from "../../quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import { DOCUMENT_TYPE_LABEL, type DocumentTypeValue } from "@/lib/validations/document";

// ─── Adapt a Document to the QuotationRow shape QuotationPreview expects ──────

function adaptDocumentToQuotationRow(doc: DocumentDetail): QuotationRow {
  return {
    id:              doc.id,
    quotationTitle:  doc.title ?? "",
    quotationNumber: doc.documentNumber,
    quotationDate:   doc.documentDate,
    validTillDate:   doc.validTillDate,
    subtitle:        doc.subtitle,
    logo:            doc.logo,
    currency:        doc.currency,
    fromName:        doc.fromName,
    fromAddress:     doc.fromAddress,
    fromGstin:       doc.fromGstin,
    fromPan:         doc.fromPan,
    clientId:        doc.clientId,
    clientName:      doc.clientName,
    clientAddress:   doc.clientAddress,
    clientGstin:     doc.clientGstin,
    showShipping:    false,
    shipFromWarehouseId: null,
    shippingName:    null,
    shippingAddress: null,
    shippingPostalCode: null,
    shippingState:   null,
    transporterName: null,
    distance:        null,
    vehicleType:     null,
    vehicleNumber:   null,
    transportDocNumber: null,
    transactionType: null,
    discountLabel:   doc.discountLabel,
    discountAmount:  doc.discountAmount,
    additionalCharges: Array.isArray(doc.additionalCharges)
      ? (doc.additionalCharges as { label: string; amount: number }[])
      : [],
    subTotal:        doc.subTotal,
    totalTax:        doc.totalTax,
    totalDiscount:   doc.totalDiscount,
    totalQuantity:   doc.totalQuantity,
    totalAmount:     doc.totalAmount,
    amountInWords:   doc.amountInWords,
    termsAndConditions: doc.termsAndConditions,
    notes:           doc.notes,
    signature:       doc.signature,
    additionalInfo:  doc.additionalInfo,
    contactDetails:  doc.contactDetails,
    attachments:     doc.attachments,
    customFields: Array.isArray(doc.customFields)
      ? (doc.customFields as { label: string; value: string }[])
      : [],
    settings: {
      ...DEFAULT_QUOTATION_SETTINGS,
      ...(typeof doc.settings === "object" && doc.settings !== null
        ? (doc.settings as Partial<QuotationSettings>)
        : {}),
    },
    status:  "APPROVED", // read-only display; APPROVED uses the green badge style
    items:   doc.items.map((item) => ({
      id:          item.id,
      productId:   item.productId,
      name:        item.name,
      sku:         item.sku,
      hsnSac:      item.hsnSac,
      unit:        item.unit,
      description: item.description,
      image:       item.image,
      groupName:   item.groupName,
      quantity:    item.quantity,
      rate:        item.rate,
      discount:    item.discount,
      taxRate:     item.taxRate,
      taxAmount:   item.taxAmount,
      amount:      item.amount,
      total:       item.total,
      sortOrder:   item.sortOrder,
    })),
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function DocumentStatusBadge({ status }: { status: string }) {
  const style =
    status === "ISSUED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "CANCELLED"
      ? "bg-zinc-100 text-zinc-500"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_BS: BusinessSettingsRow = {};

export default function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = useDocument(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.document) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-zinc-500">
        <p>Document not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/documents")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  const doc = data.document;
  const typeLabel = DOCUMENT_TYPE_LABEL[doc.type as DocumentTypeValue] ?? doc.type;
  const adapted = adaptDocumentToQuotationRow(doc);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/sales-and-invoices/documents")}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <nav className="flex items-center gap-1 text-sm text-zinc-400">
              <span
                className="cursor-pointer hover:text-zinc-700"
                onClick={() => router.push("/sales-and-invoices/documents")}
              >
                Documents
              </span>
              <ChevronRight className="size-3.5" />
              <span className="text-zinc-900 font-medium">{doc.documentNumber}</span>
            </nav>
            <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {typeLabel}
            </span>
            <DocumentStatusBadge status={doc.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document preview */}
      <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
        <QuotationPreview
          quotation={adapted}
          businessSettings={EMPTY_BS}
          settings={adapted.settings}
        />
      </div>
    </div>
  );
}
