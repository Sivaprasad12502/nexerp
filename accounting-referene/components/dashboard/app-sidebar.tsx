"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Cable,
  ChartColumn,
  FileText,
  ShoppingCart,
  UserPlus,
  ClipboardList,
  Landmark,
  Monitor,
  Package,
  Settings,
  Users,
  Workflow,
  type LucideIcon,
  Contact,
  LayoutDashboard,
} from "lucide-react";

type NavChild = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  children?: NavChild[];
};

const items: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Contact",
    icon: Contact,
    href: "/contact",
  },
  {
    
    label: "Sales & Invoices",
    icon: FileText,
    children: [
      { label: "Clients & Prospects", href: "/sales-and-invoices/clients-prospects" },
      // { label: "Connected Customers", href: "/sales-and-invoices/connected-customers" },
      { label: "Quotation & Estimates", href: "/sales-and-invoices/quotation-estimates" },
      // { label: "Documents", href: "/sales-and-invoices/documents" },
      { label: "Proforma Invoices", href: "/sales-and-invoices/proforma-invoices" },
      { label: "Invoices", href: "/sales-and-invoices/invoice" },
      { label: "Payment Receipts", href: "/sales-and-invoices/payement-receipts" },
      { label: "Sales Orders", href: "/sales-and-invoices/sales-order" },
      { label: "Delivery Challans", href: "/sales/delivery-challans" },
      { label: "Credit Notes", href: "/sales/credit-notes" },
    ],
  },
  {
    label: "Purchases & Expenses",
    icon: ShoppingCart,
    children: [
      { label: "Vendor Leads", href: "/purchases/vendor-leads"},
      { label: "Vendors & Suppliers", href: "/purchases/vendors" },
      { label: "Purchases & Expenses", href: "/purchases/expenditure" },
      { label: "Purchase Orders", href: "/purchases/purchase-order" },
      { label: "Payout Receipts", href: "/purchases/payout-reciept" },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    href: "/accounting",
  },
  {
    label: "Sales CRM & Leads",
    icon: Monitor,
    href: "/sales-crm-and-leads",
  },
  {
    label: "Products & Inventory",
    icon: Package,
    children: [
      { label: "All Items", href: "/products-inventory/all-items" },
      { label: "Warehouse", href: "/products-inventory/warehouse" },
    ],
  },
  {
    label: "Reports",
    icon: ChartColumn,
    href: "/reports",
  },
  {
    label: "Workflows & Automations",
    icon: Workflow,
    href: "/workflows-and-automations",
  },
  {
    label: "Banking & Payments",
    icon: Landmark,
    href: "/banking-and-payments",
  },
  {
    label: "Payroll & HRMS",
    icon: ClipboardList,
    href: "/payroll-and-hrms",
  },
  {
    label: "Manage Team",
    icon: Users,
    children: [
      {
        label: "Manage Users",
        href: "/business-settings/all-users",
      },
      {
        label: "Manage Team Roles",
        href: "/business-settings/roles-permissions",
      },
    ],
  },
  {
    label: "Business Settings",
    icon: Settings,
    href: "/business-settings",
  },
  {
    label: "Integrations",
    icon: Cable,
    href: "/business-settings/integrations",
  },
];

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

  const setHovering = (value: boolean) => {
    setHover(value);
    onHoverChange?.(value);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`fixed bottom-0 left-0 top-14 z-30 flex flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out ${
        expanded ? "w-64" : "w-16"
      } ${hover && !pinned ? "shadow-xl" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-sm font-semibold text-white">
          S
        </div>

        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">
              Sivaprasad R
            </p>
            <p className="truncate text-xs text-zinc-400">Premium Expired</p>
          </div>
        )}
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          className={`flex h-8 w-full items-center justify-center rounded-md bg-[#ff8a3d] text-sm font-semibold text-white hover:bg-[#fb7a26] ${
            expanded ? "px-3" : "px-0"
          }`}
        >
          {expanded ? "Upgrade" : "↑"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;

            if (item.children?.length) {
              const isOpen = expanded && openGroups.includes(item.label);

              const hasActiveChild = item.children.some(
                (child) =>
                  pathname === child.href ||
                  pathname.startsWith(`${child.href}/`),
              );

              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    title={!expanded ? item.label : undefined}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                      hasActiveChild
                        ? "bg-[#f3effc] text-[#6d28d9]"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />

                    {expanded && (
                      <>
                        <span className="flex-1 truncate text-left">
                          {item.label}
                        </span>

                        <ChevronDown
                          className={`size-4 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {isOpen && (
                    <ul className="mt-1 space-y-0.5">
                      {item.children.map((child) => {
                        const active = pathname === child.href;

                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`flex h-8 items-center rounded-md py-1 pl-11 pr-3 text-[13px] transition-colors ${
                                active
                                  ? "font-medium text-[#6d28d9]"
                                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // const active =
            //   item.href &&
            //   (pathname === item.href || pathname.startsWith(`${item.href}/`));
            const active = pathname === item.href;
            return (
              <li key={item.label}>
                <Link
                  href={item.href ?? "#"}
                  title={!expanded ? item.label : undefined}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                    active
                      ? "bg-[#f3effc] font-medium text-[#6d28d9]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />

                  {expanded && (
                    <>
                      <span className="truncate">{item.label}</span>

                      {item.badge && (
                        <span className="ml-auto rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-100 p-2">
        <button
          type="button"
          title={!expanded ? "Invite Team Members" : undefined}
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[#6d28d9] hover:bg-[#f3effc]"
        >
          <UserPlus className="size-5 shrink-0" />

          {expanded && <span className="truncate">Invite Team Members</span>}
        </button>
      </div>
    </aside>
  );
}
