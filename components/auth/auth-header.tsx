"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CircleHelp, User } from "lucide-react";

import { RefrensLogo } from "./refrens-logo";
import {
  buildLoginUrl,
  buildRegisterUrl,
  persistDocumentAuthContext,
  resolveAuthCallback,
  resolveAuthEmail,
} from "@/lib/public-auth-flow";

function AuthHeaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const rawEmail = searchParams.get("email");

  const resolvedCallback = resolveAuthCallback(rawCallback);
  const email = resolveAuthEmail(rawEmail);
  const linkCallback = resolvedCallback ?? "/business-new";

  useEffect(() => {
    if (rawCallback || rawEmail) {
      persistDocumentAuthContext(rawCallback, rawEmail);
    }
  }, [rawCallback, rawEmail]);

  const onLogin = pathname?.startsWith("/login");

  // Preserve callbackUrl + email when switching between login and register.
  const cta = onLogin
    ? { label: "Register", href: buildRegisterUrl(linkCallback, email || undefined) }
    : { label: "Login", href: buildLoginUrl(linkCallback, email || undefined) };

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

export function AuthHeader() {
  return (
    <Suspense fallback={<header className="px-6 py-5 sm:px-10" />}>
      <AuthHeaderInner />
    </Suspense>
  );
}
