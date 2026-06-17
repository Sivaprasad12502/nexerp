"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { VendorForm, type VendorRow } from "../../components/vendor-form";

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<{ vendor: VendorRow }>({
    queryKey: ["vendors", id],
    queryFn: () => fetch(`/api/vendors/${id}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (isError || !data?.vendor) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-red-500">
        Vendor not found.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Purchases &amp; Expenses{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" /> Vendors{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" /> Edit
        </nav>
        <h1 className="text-2xl font-bold text-zinc-900">Edit Vendor</h1>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <VendorForm
          initialData={data.vendor}
          onCancel={() => router.push(`/purchases/vendors/${id}`)}
          onSaved={(savedId) => router.push(`/purchases/vendors/${savedId}`)}
        />
      </div>
    </div>
  );
}
