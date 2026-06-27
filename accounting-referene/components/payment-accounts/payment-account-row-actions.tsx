"use client";

import { Ban, Eye, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentAccount } from "@/lib/hooks/use-payment-accounts";

export function PaymentAccountRowActions({
  account,
  accounts,
  onEdit,
  onToggleStatus,
}: {
  account: PaymentAccount;
  accounts: PaymentAccount[];
  onEdit: (account: PaymentAccount) => void;
  onToggleStatus: (account: PaymentAccount) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(account)}
        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        aria-label="Edit"
      >
        <Pencil className="size-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex flex-col items-center rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-100"
          >
            <MoreHorizontal className="size-4" />
            <span className="text-[10px]">More</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onEdit(account)}>
            <Pencil className="mr-2 size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleStatus(account)}>
            <Ban className="mr-2 size-4" />
            {account.status === "ACTIVE" ? "Mark as Inactive" : "Mark as Active"}
          </DropdownMenuItem>
          {account.upiId && account.linkedBankAccountId && (
            <DropdownMenuItem
              onClick={() => {
                const linked = accounts.find((a) => a.id === account.linkedBankAccountId);
                if (linked) onEdit(linked);
                else toast.info("Linked bank account not found");
              }}
            >
              <Pencil className="mr-2 size-4" /> Edit Linked Bank Account
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.info("Ledger statements coming soon")}>
            <Eye className="mr-2 size-4" /> View Ledger Statement
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
