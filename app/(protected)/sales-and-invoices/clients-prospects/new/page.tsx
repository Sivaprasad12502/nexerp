"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ClientForm } from "../components/client-form";

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      <div className="rounded-b-md bg-white px-6 py-9 shadow-sm ring-1 ring-zinc-100 sm:px-10">
        <div className="flex items-center gap-2 text-base text-zinc-500">
          <span>Your Clients</span>
          <ChevronRight className="size-5" />
          <span className="text-zinc-900">Add Client</span>
        </div>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-900">
          Add Client
        </h1>
      </div>

      <div className="mt-6 bg-white shadow-sm ring-1 ring-zinc-100">
        <ClientForm
          onCancel={() => router.push("/sales-and-invoices/clients-prospects")}
          onSaved={() => router.push("/sales-and-invoices/clients-prospects")}
        />
      </div>
    </div>
  );
}
