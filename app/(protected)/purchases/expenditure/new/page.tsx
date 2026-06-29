"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { QuotationForm } from "../../../sales-and-invoices/quotation-estimates/components/quotation-form";

const EXP_CONFIG = {
  createEndpoint: "/api/expenditures",
  updateEndpoint: (id: string) => `/api/documents/${id}`,
  invalidateKey: "expenditures",
  titleFallback: "Expenditure",
  resourceLabel: "Purchase / Expense",
  responseKey: "document",
  partyType: "vendor",
} as const;

export default function NewExpenditurePage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-6 sm:px-8">
        <h1 className="text-center text-2xl font-bold text-zinc-900">
          Create New Purchase / Expense
        </h1>

        {/* Step indicator */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              1
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              Purchase Details
            </span>
          </div>

          <ChevronRight className="size-4 text-zinc-300" />

          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-zinc-300 text-xs font-semibold text-zinc-400">
              2
            </span>
            <span className="text-sm font-medium text-zinc-400">
              Customise &amp; Share (optional)
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-6 sm:px-8">
        <QuotationForm
          config={EXP_CONFIG}
          onCancel={() => router.push("/purchases/expenditure")}
          onSaved={(id) => router.push(`/purchases/expenditure/${id}`)}
        />
      </div>
    </div>
  );
}
