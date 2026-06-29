"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

import { useVendorLead } from "@/lib/hooks/use-vendor-leads";
import { VendorLeadForm } from "../../components/vendor-lead-form";

export default function EditVendorLeadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useVendorLead(params.id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.vendorLead) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Vendor lead not found.{" "}
        <button
          type="button"
          onClick={() => router.push("/purchases/vendor-leads")}
          className="text-[#7438dc] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Vendor Lead Dashboard{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" />
          Edit
        </nav>
        <h1 className="text-2xl font-bold text-zinc-900">Edit Vendor Lead</h1>
      </div>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <VendorLeadForm
          initialData={data.vendorLead}
          onCancel={() => router.push(`/purchases/vendor-leads/${params.id}`)}
          onSaved={(id: string) => router.push(`/purchases/vendor-leads/${id}`)}
        />
      </div>
    </div>
  );
}
