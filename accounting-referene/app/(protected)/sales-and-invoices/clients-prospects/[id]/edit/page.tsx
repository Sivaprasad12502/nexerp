"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";

import { ClientForm, type ClientRow } from "../../components/client-form";

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<{ client: ClientRow }>({
    queryKey: ["clients", id],
    queryFn: () => fetch(`/api/clients/${id}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.client) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Client not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      <div className="rounded-b-md bg-white px-6 py-9 shadow-sm ring-1 ring-zinc-100 sm:px-10">
        <div className="flex items-center gap-2 text-base text-zinc-500">
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() => router.push("/sales-and-invoices/clients-prospects")}
          >
            Your Clients
          </span>
          <ChevronRight className="size-5" />
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() => router.push(`/sales-and-invoices/clients-prospects/${id}`)}
          >
            {data.client.businessName}
          </span>
          <ChevronRight className="size-5" />
          <span className="text-zinc-900">Edit</span>
        </div>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-900">
          Edit Client
        </h1>
      </div>

      <div className="mt-6 bg-white shadow-sm ring-1 ring-zinc-100">
        <ClientForm
          initialData={data.client}
          onCancel={() => router.push(`/sales-and-invoices/clients-prospects/${id}`)}
          onSaved={(savedId) =>
            router.push(`/sales-and-invoices/clients-prospects/${savedId}`)
          }
        />
      </div>
    </div>
  );
}
