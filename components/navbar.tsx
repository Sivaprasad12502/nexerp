import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Products", href: "#products", hasMenu: true },
  { label: "Pricing", href: "#pricing", hasMenu: false },
  { label: "India", href: "#region", hasMenu: true },
  { label: "Wall of Love", href: "#wall-of-love", hasMenu: false },
];

export function Navbar() {
  return (
    <header className="sticky top-4 z-50 w-full px-4">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 px-3 pl-4 shadow-sm backdrop-blur-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-4" fill="none">
              <path
                d="M6 18V6h6a4 4 0 0 1 0 8H8m4 0 4 4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Refrens</span>
        </Link>

        {/* Center links */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
                {link.hasMenu && <ChevronDown className="size-3.5 opacity-60" />}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth actions */}
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
