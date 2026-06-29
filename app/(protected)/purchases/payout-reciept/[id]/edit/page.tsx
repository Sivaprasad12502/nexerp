"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

import { usePayoutReceipt } from "@/lib/hooks/use-payout-receipts";
import { PayoutReceiptForm } from "../../components/payout-receipt-form";

export default function EditPayoutReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = usePayoutReceipt(params.id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.payoutReceipt) {
    return <div className="p-8 text-center text-zinc-500">Payout receipt not found.</div>;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Payout Receipts <ChevronRight className="mx-0.5 inline size-3.5" />
          Edit
        </nav>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Edit Payout Receipt</h1>
      </div>
      <div className="px-4 py-8 sm:px-6">
        <PayoutReceiptForm
          initialData={data.payoutReceipt}
          onCancel={() => router.push(`/purchases/payout-reciept/${params.id}`)}
          onSaved={(id: string) => router.push(`/purchases/payout-reciept/${id}`)}
        />
      </div>
    </div>
  );
}
