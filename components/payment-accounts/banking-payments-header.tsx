"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AccountTypeChoice } from "./add-payment-account-type-modal";

type BankingTab =
  | { label: string; href: string; comingSoon?: false }
  | { label: string; href: null; comingSoon: true };

const BANKING_TABS: BankingTab[] = [
  {
    label: "All Payment Accounts",
    href: "/banking-and-payments/payment-accounts",
  },
  {
    label: "Bank Accounts",
    href: "/banking-and-payments/bank-accounts",
  },
  {
    label: "Employee Accounts",
    href: "/banking-and-payments/employee-accounts",
  },
  {
    label: "Bank Reconciliation",
    href: "/banking-and-payments/bank-reconciliation",
  },
  {
    label: "Refrens Payments",
    href: null,
    comingSoon: true,
  },
];

function isTabActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BankingPaymentsHeader({
  onNewAccount,
  onQuickAdd,
  showNewButton = true,
  children,
}: {
  onNewAccount?: () => void;
  onQuickAdd?: (type: AccountTypeChoice) => void;
  showNewButton?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  const { data: businessData } = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const res = await fetch("/api/business");
      if (!res.ok) return null;
      return res.json() as Promise<{ business?: { brandName?: string | null; name?: string } }>;
    },
    staleTime: 60_000,
  });

  const orgName =
    businessData?.business?.brandName?.trim() ||
    businessData?.business?.name?.trim() ||
    "Business";

  const handleQuickAdd = (type: AccountTypeChoice) => {
    if (onQuickAdd) {
      onQuickAdd(type);
      return;
    }
    onNewAccount?.();
  };

  return (
    <div className="border-b border-zinc-200 border-t-4 border-t-[#6d28d9] bg-white px-6 pb-0 pt-4 sm:px-8">
      <nav className="text-sm text-zinc-400">
        {orgName} <span className="mx-0.5">&gt;</span> Payment Accounts{" "}
        <span className="mx-0.5">&gt;</span>
      </nav>

      <div className="mt-1 flex items-start justify-between gap-4 pb-4">
        <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
          Payment Accounts
          <span className="text-[22px] leading-none" aria-hidden>
            💡
          </span>
        </h1>

        {showNewButton && onNewAccount && (
          <div className="flex shrink-0 items-stretch overflow-hidden rounded-md">
            <button
              type="button"
              onClick={onNewAccount}
              className="flex items-center gap-2 bg-[#e91e8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4177a]"
            >
              <Plus className="size-4" />
              New Payments Account
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center border-l border-[#c4177a]/60 bg-[#e91e8c] px-2.5 py-2 text-white hover:bg-[#c4177a]"
                  aria-label="More account options"
                >
                  <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => handleQuickAdd("BANK")}>
                  Add Bank Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAdd("EMPLOYEE")}>
                  Add Employee Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAdd("OTHER")}>
                  Add Other Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="flex gap-0 overflow-x-auto">
        {BANKING_TABS.map((tab) => {
          if (tab.comingSoon || !tab.href) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => toast.info("Refrens Payments coming soon")}
                className="mr-6 shrink-0 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-600 hover:text-zinc-800"
              >
                {tab.label}
              </button>
            );
          }

          const active = isTabActive(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mr-6 shrink-0 border-b-2 pb-3 text-sm transition-colors ${
                active
                  ? "border-[#6d28d9] font-semibold text-[#6d28d9]"
                  : "border-transparent font-medium text-zinc-600 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
