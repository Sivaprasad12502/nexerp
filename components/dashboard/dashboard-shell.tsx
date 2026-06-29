"use client";

import { useState } from "react";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  // `pinned` = sidebar kept open via the hamburger. When not pinned the rail
  // shows icons only and expands on hover (as an overlay).
  const [pinned, setPinned] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader onToggleSidebar={() => setPinned((p) => !p)} />

      <AppSidebar pinned={pinned} />

      <main
        className={`pt-14 transition-[margin] duration-200 ease-out ${
          pinned ? "ml-64" : "ml-16"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
