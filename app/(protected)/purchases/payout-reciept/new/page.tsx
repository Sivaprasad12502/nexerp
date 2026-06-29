"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Lightbulb } from "lucide-react";

import { PayoutReceiptForm } from "../components/payout-receipt-form";
import type { ReceiptRecordType } from "../components/record-new-payout-modal";

function parseReceiptType(param: string | null): ReceiptRecordType | undefined {
  if (param === "vendor-advance") return "VENDOR_ADVANCE";
  if (param === "payout-receipt") return "PAYOUT_RECEIPT";
  return undefined;
}

export default function NewPayoutReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReceiptType = parseReceiptType(searchParams.get("type"));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-6 sm:px-8">
        <nav className="text-sm text-zinc-400">
          Payout Receipts <ChevronRight className="mx-0.5 inline size-3.5" />
          New
        </nav>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-zinc-900">
          New Payout Receipt
          <Lightbulb className="size-6 text-amber-400" />
        </h1>

        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#7438dc] text-xs font-bold text-white">
              1
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              Add Payout Receipt Details
            </span>
          </div>
          <ChevronRight className="size-4 text-zinc-300" />
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-zinc-300 text-xs font-semibold text-zinc-400">
              2
            </span>
            <span className="text-sm font-medium text-zinc-400">
              Customise &amp; Share
            </span>
          </div>
        </div>
      </div>
      <div className="px-4 py-8 sm:px-6">
        <PayoutReceiptForm
          initialReceiptType={initialReceiptType}
          onCancel={() => router.push("/purchases/payout-reciept")}
          onSaved={(id) => router.push(`/purchases/payout-reciept/${id}`)}
        />
      </div>
    </div>
  );
}
