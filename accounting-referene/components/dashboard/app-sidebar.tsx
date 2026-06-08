"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Contact,
  FileText,
  LayoutDashboard,
  ShoppingCart,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; icon: LucideIcon; href: string };
type NavGroup = { label: string; icon: LucideIcon; children: string[] };

const items: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Contacts", icon: Contact, href: "/contacts" },
];

const groups: NavGroup[] = [
  {
    label: "Sales & Invoices",
    icon: FileText,
    children: [
      "Clients & Prospects",
      "Quotation & Estimates",
      "Proforma Invoices",
      "Invoices",
      "Payment Receipts",
      "Sales Orders",
      "Delivery Challans",
      "Credit Notes",
    ],
  },
  {
    label: "Purchases & Expenses",
    icon: ShoppingCart,
    children: [
      "Vendors",
      "Purchase Orders",
      "Bills",
      "Payments Made",
      "Expenses",
      "Debit Notes",
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    children: ["Chart of Accounts", "Journal Entries", "Ledgers", "Cash & Bank", "Reports"],
  },
];

function slug(label: string) {
  return label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AppSidebar({
  pinned,
  onHoverChange,
}: {
  pinned: boolean;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Sales & Invoices"]);

  const expanded = pinned || hover;

  const setHovering = (v: boolean) => {
    setHover(v);
    onHoverChange?.(v);
  };

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`fixed bottom-0 left-0 top-14 z-30 flex flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out ${
        expanded ? "w-64" : "w-16"
      } ${hover && !pinned ? "shadow-xl" : ""}`}
    >
      {/* Profile */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-sm font-semibold text-white">
          S
        </div>
        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">Sivaprasad R</p>
            <p className="truncate text-xs text-zinc-400">Premium Expired</p>
          </div>
        )}
      </div>

      {/* Upgrade */}
      <div className="px-3 pb-2">
        <button
          type="button"
          className={`flex h-8 w-full items-center justify-center rounded-md bg-[#ff8a3d] text-sm font-semibold text-white transition-colors hover:bg-[#fb7a26] ${
            expanded ? "px-3" : "px-0"
          }`}
        >
          {expanded ? "Upgrade" : "↑"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                    active
                      ? "bg-[#f3effc] font-medium text-[#6d28d9]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}

          {groups.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroups.includes(group.label) && expanded;
            return (
              <li key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  title={!expanded ? group.label : undefined}
                  className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  <Icon className="size-5 shrink-0" />
                  {expanded && (
                    <>
                      <span className="flex-1 truncate text-left">{group.label}</span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-zinc-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {isOpen && (
                  <ul className="mt-0.5 space-y-0.5 pb-1">
                    {group.children.map((child) => {
                      const href = `/${slug(child)}`;
                      const active = pathname === href;
                      return (
                        <li key={child}>
                          <Link
                            href={href}
                            className={`flex h-8 items-center rounded-md py-1 pl-11 pr-3 text-[13px] transition-colors ${
                              active
                                ? "font-medium text-[#6d28d9]"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            }`}
                          >
                            <span className="truncate">{child}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Invite */}
      <div className="border-t border-zinc-100 p-2">
        <button
          type="button"
          title={!expanded ? "Invite Team Members" : undefined}
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[#6d28d9] transition-colors hover:bg-[#f3effc]"
        >
          <UserPlus className="size-5 shrink-0" />
          {expanded && <span className="truncate">Invite Team Members</span>}
        </button>
      </div>
    </aside>
  );
}
