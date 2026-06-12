"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { QuotationForm } from "../components/quotation-form";

export default function NewQuotationPage() {
  const router = useRouter();

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
          <span className="text-zinc-900">New Quotation</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          New Quotation
        </h1>
      </div>

      {/* Form */}
      <div className="px-6 py-6 sm:px-8">
        <QuotationForm
          onCancel={() => router.push("/sales-and-invoices/quotation-estimates")}
          onSaved={(id) =>
            router.push(
              `/sales-and-invoices/quotation-estimates/${id}`,
            )
          }
        />
      </div>
    </div>
  );
}
