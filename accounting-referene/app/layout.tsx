import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "./providers/query-provider";
import { AuthSessionProvider } from "./providers/session-provider";

export const metadata: Metadata = {
  title: "Refrens — Smarter Way to Manage Your Business",
  description: "Trusted by 100,000+ businesses from 170+ countries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-right" richColors closeButton />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
