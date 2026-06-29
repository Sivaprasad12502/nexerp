"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, LogOut, Settings } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { toast } from 'sonner'
export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex items-center gap-1 rounded-full transition-opacity hover:opacity-90"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[#4a4a6a] text-sm font-semibold text-white">
          {initials}
        </span>
        <ChevronDown
          className={`size-4 text-white/80 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-xl border border-zinc-200 bg-white shadow-xl">
          {/* Caret */}
          <div className="absolute -top-2 right-5 size-4 rotate-45 border-l border-t border-zinc-200 bg-white" />

          {/* User info */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#4a4a6a] text-base font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-900">
                {session?.user?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {session?.user?.email ?? ""}
              </p>
            </div>
          </div>

          <div className="mx-4 mb-3 rounded-lg bg-[#f5f3ff] px-4 py-3">
            <p className="text-sm font-medium text-zinc-800">
              Missing out on a feature? We&apos;d love to know!
            </p>
            <a
              href="#"
              className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-[#6d3bd6] hover:underline"
            >
              Request a Feature
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div className="border-t border-zinc-100 py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Settings className="size-5 text-zinc-500" />
              User Settings
            </Link>

            <button
              type="button"
              onClick={() => {signOut({ callbackUrl: "/login" }); toast.success("Logged out successfully!")}}
              className="flex w-full items-center gap-3 px-5 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <LogOut className="size-5 text-zinc-500" />
              Logout
            </button>
          </div>

          <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <a href="#" className="hover:text-zinc-600">Blog</a>
            <span>·</span>
            <a href="#" className="hover:text-zinc-600">About</a>
            <span>·</span>
            <a href="#" className="hover:text-zinc-600">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-zinc-600">FAQs</a>
          </div>
        </div>
      )}
    </div>
  );
}
