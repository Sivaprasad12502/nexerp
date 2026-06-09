"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "General Settings",
    href: "/business-settings/general",
  },
  {
    title: "All Users",
    href: "/business-settings/all-users",
  },
  {
    title: "Roles & Permissions",
    href: "/business-settings/roles-permissions",
    badge: "BETA",
  },
  {
    title: "Accounting",
    href: "/business-settings/accounting",
  },
  {
    title: "Approval Workflow Settings",
    href: "/business-settings/approval-workflow",
  },
  {
    title: "Inventory",
    href: "/business-settings/inventory",
  },
  {
    title: "Advanced Accounting",
    href: "/business-settings/advanced-accounting",
    badge: "PRO",
  },
  {
    title: "Email Settings",
    href: "/business-settings/email-settings",
  },
  {
    title: "Lead Management System (CRM)",
    href: "/business-settings/crm",
  },
  {
    title: "Custom Fields & Tags",
    href: "/business-settings/custom-fields-tags",
  },
  {
    title: "Integrations",
    href: "/business-settings/integrations",
  },
  {
    title: "Manage Team",
    href: "/business-settings/manage-team",
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="h-full overflow-y-auto rounded-lg border border-zinc-100 bg-white px-4 py-5 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`mb-1 flex min-h-11 items-center justify-between gap-3 rounded-md px-4 py-2 text-sm transition-colors ${
            pathname === item.href ||
            (pathname === "/business-settings" && item.href === "/business-settings/all-users")
              ? "bg-zinc-100 font-medium text-[#6d28d9]"
              : "text-zinc-800 hover:bg-zinc-50"
          }`}
        >
          <span className="truncate">{item.title}</span>
          {item.badge && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                item.badge === "PRO"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
              }`}
            >
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
