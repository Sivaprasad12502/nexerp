"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";

import { QuotationForm, type QuotationRow } from "../../components/quotation-form";

export default function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<{ quotation: QuotationRow }>({
    queryKey: ["quotations", id],
    queryFn: () => fetch(`/api/quotations/${id}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.quotation) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 text-zinc-500">
        <p>Quotation not found.</p>
        <button
          type="button"
          onClick={() => router.push("/sales-and-invoices/quotation-estimates")}
          className="text-sm text-[#6d28d9] underline"
        >
          Back to Quotations
        </button>
      </div>
    );
  }

  const q = data.quotation;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="flex items-center gap-1 text-sm text-zinc-400">
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() =>
              router.push("/sales-and-invoices/quotation-estimates")
            }
          >
            Quotations
          </span>
          <ChevronRight className="size-3.5" />
          <span className="text-zinc-900">{q.quotationNumber}</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          Edit Quotation
        </h1>
      </div>

      {/* Form */}
      <div className="px-6 py-6 sm:px-8">
        <QuotationForm
          initialData={q}
          onCancel={() => router.push("/sales-and-invoices/quotation-estimates")}
          onSaved={(id) => router.push(`/sales-and-invoices/quotation-estimates/${id}`)}
        />
      </div>
    </div>
  );
}
