"use client";

import { Receipt, User } from "lucide-react";

import { Modal } from "@/components/ui/modal";

export type ReceiptRecordType = "PAYMENT_RECEIPT" | "CLIENT_ADVANCE";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ReceiptRecordType) => void;
};

export function RecordNewPaymentModal({ open, onClose, onSelect }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record New Payment"
      description="Which Payment would you like to record?"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("PAYMENT_RECEIPT")}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-[#7438dc] bg-violet-50/30 p-8 transition-colors hover:bg-violet-50"
        >
          <Receipt className="size-12 text-[#7438dc]" />
          <span className="font-semibold text-[#7438dc]">Payment Receipt</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("CLIENT_ADVANCE")}
          className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 p-8 transition-colors hover:border-[#7438dc] hover:bg-violet-50/30"
        >
          <User className="size-12 text-[#7438dc]" />
          <span className="font-semibold text-[#7438dc]">Client Advance</span>
        </button>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 px-5 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
