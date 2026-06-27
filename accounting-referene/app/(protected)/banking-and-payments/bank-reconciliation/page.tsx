"use client";

import { BankingPaymentsHeader } from "@/components/payment-accounts";

export default function BankReconciliationPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      <BankingPaymentsHeader showNewButton={false} />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-zinc-800">Coming soon</p>
          <p className="mt-2 text-sm text-zinc-500">
            Bank reconciliation will let you match your bank statements with recorded
            transactions.
          </p>
        </div>
      </div>
    </div>
  );
}
