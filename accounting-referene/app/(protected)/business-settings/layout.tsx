import { SettingsSidebar } from "@/components/dashboard/settings-sidebar";
import { ChevronRight } from "lucide-react";

export default function BusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-5">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>Sivaprasad R</span>
          <ChevronRight className="size-4" />
          <span>Business Settings</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Business Settings
        </h1>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <SettingsSidebar />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
