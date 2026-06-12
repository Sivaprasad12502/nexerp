"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { VendorForm } from "../components/vendor-form";

export default function NewVendorPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Purchases &amp; Expenses{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" /> Vendors{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" /> New Vendor
        </nav>
        <h1 className="text-2xl font-bold text-zinc-900">Add Vendor</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <VendorForm onCancel={() => router.push("/purchases/vendors")} />
      </div>
    </div>
  );
}
