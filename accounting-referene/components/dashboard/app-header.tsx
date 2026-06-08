"use client";

import Link from "next/link";
import { Bell, CircleHelp, Gift, LayoutGrid, Menu, Search } from "lucide-react";
import { UserMenu } from "./user-menu";

export function AppHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 bg-[#6d3bd6] pl-3 pr-4 text-white">
      {/* Hamburger */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
      >
        <Menu className="size-5" />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg viewBox="0 0 40 40" className="size-6" aria-hidden>
          <path d="M20 6 34 32H6L20 6Z" fill="#ffffff" />
          <path d="M20 15 27 29H13L20 15Z" fill="#6d3bd6" />
        </svg>
        <span className="text-lg font-semibold tracking-tight">Refrens</span>
      </Link>

      {/* Subscription notice */}
      {/* <div className="ml-4 hidden items-center text-sm text-white/85 lg:flex">
        Subscription Expired:&nbsp;
        <span className="font-medium text-white underline-offset-2 hover:underline">
          Upgrade to access premium features.
        </span>
      </div> */}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <HeaderIcon label="Search">
          <Search className="size-5" />
        </HeaderIcon>
        <HeaderIcon label="Apps">
          <LayoutGrid className="size-5" />
        </HeaderIcon>
        <HeaderIcon label="What's new">
          <Gift className="size-5" />
        </HeaderIcon>
        <HeaderIcon label="Notifications">
          <Bell className="size-5" />
        </HeaderIcon>
        <HeaderIcon label="Help">
          <CircleHelp className="size-5" />
        </HeaderIcon>

        <UserMenu />
      </div>
    </header>
  );
}

function HeaderIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  );
}
