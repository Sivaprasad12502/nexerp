"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

import { useDocument } from "@/lib/hooks/use-documents";
import {
  adaptDocumentToQuotationRow,
  getDocumentEditFormConfig,
} from "@/lib/document-adapter";
import { QuotationForm } from "../../../quotation-estimates/components/quotation-form";
import { DOCUMENT_TYPE_LABEL, type DocumentTypeValue } from "@/lib/validations/document";

export default function EditProformaInvoicePage({
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
        <p>Proforma invoice not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/proforma-invoices")}
          className="text-sm text-[#7438dc] underline"
        >
          Back to Proforma Invoices
        </button>
      </div>
    );
  }

  const doc = data.document;
  const typeLabel =
    DOCUMENT_TYPE_LABEL[doc.type as DocumentTypeValue] ?? doc.type;
  const adapted = adaptDocumentToQuotationRow(doc, typeLabel);
  const editConfig = {
    ...getDocumentEditFormConfig(doc),
    invalidateKey: "proforma-invoices",
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="flex items-center gap-1 text-sm text-zinc-400">
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() => router.push("/sales-and-invoices/proforma-invoices")}
          >
            Proforma Invoices
          </span>
          <ChevronRight className="size-3.5" />
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() => router.push(`/sales-and-invoices/proforma-invoices/${id}`)}
          >
            {doc.documentNumber}
          </span>
          <ChevronRight className="size-3.5" />
          <span className="text-zinc-900">Edit</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          Edit {typeLabel}
        </h1>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <QuotationForm
          initialData={adapted}
          config={editConfig}
          onCancel={() => router.push(`/sales-and-invoices/proforma-invoices/${id}`)}
          onSaved={(savedId) =>
            router.push(`/sales-and-invoices/proforma-invoices/${savedId}`)
          }
        />
      </div>
    </div>
  );
}
