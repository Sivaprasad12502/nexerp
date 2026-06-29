import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PublicLayoutShell } from "@/components/public-layout-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Refrens — Smarter Way to Manage Your Business",
  description: "Trusted by 100,000+ businesses from 170+ countries.",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicLayoutShell>{children}</PublicLayoutShell>;
}
