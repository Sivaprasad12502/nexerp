"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { isPublicDocumentPath } from "@/lib/public-auth-flow";

function PublicLayoutShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = isPublicDocumentPath(pathname);

  if (hideNavbar) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export function PublicLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PublicLayoutShellInner>{children}</PublicLayoutShellInner>
    </Suspense>
  );
}
