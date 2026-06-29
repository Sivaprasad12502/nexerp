"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Gem,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PayoutReceiptRow } from "@/lib/hooks/use-payout-receipts";

type Props = {
  receipt: PayoutReceiptRow;
  onDelete?: () => void;
  onSendEmail?: () => void;
  onQuickPreview?: () => void;
};

export function PayoutReceiptMoreMenu({
  receipt,
  onDelete,
  onSendEmail,
  onQuickPreview,
}: Props) {
  const router = useRouter();

  const stub = (label: string) => () => toast.info(`${label} is coming soon`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <span className="sr-only">More actions</span>
          ⋯
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onQuickPreview ?? (() => router.push(`/purchases/payout-reciept/${receipt.id}`))}>
          <Eye className="mr-2 size-4 text-[#7438dc]" />
          Quick Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/purchases/payout-reciept/${receipt.id}`)}>
          <ExternalLink className="mr-2 size-4 text-[#7438dc]" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/purchases/payout-reciept/${receipt.id}/edit`)}
        >
          <Pencil className="mr-2 size-4 text-[#7438dc]" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/purchases/payout-reciept/${receipt.id}`)}
        >
          <Download className="mr-2 size-4 text-[#7438dc]" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSendEmail}>
          <Mail className="mr-2 size-4 text-[#7438dc]" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-60">
          <MessageCircle className="mr-2 size-4 text-green-600" />
          <span className="flex-1">Send Whatsapp</span>
          <Gem className="size-4 text-orange-400" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={stub("Vendor Statement")}>
          <FileText className="mr-2 size-4 text-[#7438dc]" />
          View Vendor Statement
        </DropdownMenuItem>
        <DropdownMenuItem onClick={stub("Ledger Statement")}>
          <FileText className="mr-2 size-4 text-[#7438dc]" />
          View Ledger Statement
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
