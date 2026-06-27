"use client";

import { useState } from "react";
import { Building2, User, Wallet, X } from "lucide-react";

export type AccountTypeChoice = "BANK" | "EMPLOYEE" | "OTHER";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: (type: AccountTypeChoice) => void;
};

export function AddPaymentAccountTypeModal({ open, onClose, onContinue }: Props) {
  const [choice, setChoice] = useState<AccountTypeChoice>("BANK");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Add New Payment Account</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="mb-5 text-center text-sm text-zinc-600">
            Which account would you like to add?
          </p>
          <div className="space-y-3">
            <TypeCard
              selected={choice === "BANK"}
              onSelect={() => setChoice("BANK")}
              icon={Building2}
              title="Bank Account"
              description="All types of bank accounts"
            />
            <TypeCard
              selected={choice === "EMPLOYEE"}
              onSelect={() => setChoice("EMPLOYEE")}
              icon={User}
              title="Employee Account"
              description="Add your employees to manage and track salaries & reimbursements."
            />
            <TypeCard
              selected={choice === "OTHER"}
              onSelect={() => setChoice("OTHER")}
              icon={Wallet}
              title="Other Account"
              description="Cash, Debit/Credit cards, UPI, Wallets and more"
            />
          </div>
          <div className="mt-5 rounded-lg bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            Add Accounts to easily manage and track your withdrawals, deposits, salaries,
            reimbursements and more{" "}
            <button type="button" className="text-[#7438dc] hover:underline">
              Learn More
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onContinue(choice)}
            className="rounded-md bg-[#7438dc] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-[#7438dc] bg-violet-50/40 ring-2 ring-[#7438dc]/20"
          : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-[#7438dc]" : "border-zinc-300"
        }`}
      >
        {selected && <span className="size-2 rounded-full bg-[#7438dc]" />}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className={`size-5 ${selected ? "text-[#7438dc]" : "text-zinc-400"}`} />
          <span className={`font-semibold ${selected ? "text-[#7438dc]" : "text-zinc-800"}`}>
            {title}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
    </button>
  );
}
