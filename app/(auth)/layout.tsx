import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

import "../globals.css";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = {
  title: "Refrens — Sign in",
  description: "Login or sign up to your Refrens account.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen bg-[#fbfbfd] text-zinc-900">
      <AuthHeader />
      <main>{children}</main>

      {/* Chat widget */}
      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 flex size-13 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
}
