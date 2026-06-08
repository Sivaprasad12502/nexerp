"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, User } from "lucide-react";

import { RefrensLogo } from "./refrens-logo";

export function AuthHeader() {
  const pathname = usePathname();
  const onLogin = pathname?.startsWith("/login");

  // Show the opposite action of the current page.
  const cta = onLogin
    ? { label: "Register", href: "/register" }
    : { label: "Login", href: "/login" };

  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/">
        <RefrensLogo />
      </Link>

      <div className="flex items-center gap-5">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <CircleHelp className="size-4" />
          Support
        </button>
        <Link
          href={cta.href}
          className="flex items-center gap-1.5 rounded-md border border-[#7c3aed]/40 px-4 py-1.5 text-sm font-medium text-[#6d28d9] transition-colors hover:bg-[#7c3aed]/5"
        >
          <User className="size-4" />
          {cta.label}
        </Link>
      </div>
    </header>
  );
}
