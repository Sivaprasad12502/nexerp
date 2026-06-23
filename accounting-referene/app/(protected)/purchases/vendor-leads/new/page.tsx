"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { VendorLeadForm } from "../components/vendor-lead-form";

export default function NewVendorLeadPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Vendor Lead Dashboard{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" />
          Add New Vendor Lead
        </nav>
        <h1 className="text-2xl font-bold text-zinc-900">Add New Vendor Lead</h1>
      </div>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <VendorLeadForm
          onCancel={() => router.push("/purchases/vendor-leads")}
          onSaved={() => router.push("/purchases/vendor-leads")}
        />
      </div>
    </div>
  );
}
