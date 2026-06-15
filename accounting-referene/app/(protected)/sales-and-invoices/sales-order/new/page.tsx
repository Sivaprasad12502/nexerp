"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { QuotationForm } from "../../quotation-estimates/components/quotation-form";

const SO_CONFIG = {
  createEndpoint: "/api/sales-orders",
  updateEndpoint: (id: string) => `/api/documents/${id}`,
  invalidateKey: "sales-orders",
  titleFallback: "Sales Order",
  resourceLabel: "Sales Order",
  responseKey: "document",
} as const;

export default function NewSalesOrderPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-6 sm:px-8">
        <h1 className="text-center text-2xl font-bold text-zinc-900">
          Create New Sales Order
        </h1>

        {/* Step indicator */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {/* Step 1 — active */}
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              1
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              Sales Order Details
            </span>
          </div>

          <ChevronRight className="size-4 text-zinc-300" />

          {/* Step 2 — inactive */}
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-zinc-300 text-xs font-semibold text-zinc-400">
              2
            </span>
            <span className="text-sm font-medium text-zinc-400">
              Design &amp; Share (optional)
            </span>
          </div>
        </div>
      </div>

      {/* Form — reuses QuotationForm with Sales Order config */}
      <div className="px-6 py-6 sm:px-8">
        <QuotationForm
          config={SO_CONFIG}
          onCancel={() => router.push("/sales-and-invoices/sales-order")}
          onSaved={() => router.push("/sales-and-invoices/sales-order")}
        />
      </div>
    </div>
  );
}
