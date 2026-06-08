import Link from "next/link";
import { ChevronDown, Headset, User, Zap } from "lucide-react";

export function OnboardingHeader() {
  return (
    <header className="flex h-14 items-center justify-between bg-[#6d3bd6] px-4 text-white sm:px-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg viewBox="0 0 40 40" className="size-6" aria-hidden>
          <path d="M20 6 34 32H6L20 6Z" fill="#ffffff" />
          <path d="M20 15 27 29H13L20 15Z" fill="#6d3bd6" />
        </svg>
        <span className="text-lg font-semibold tracking-tight">Refrens</span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Shortcuts"
          className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        >
          <Zap className="size-5" />
        </button>
        <button
          type="button"
          aria-label="AI Assistant"
          className="flex size-9 items-center justify-center rounded-md font-serif text-base italic transition-colors hover:bg-white/10"
        >
          Ai
        </button>
        <button
          type="button"
          aria-label="Support"
          className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        >
          <Headset className="size-5" />
        </button>
        <button
          type="button"
          className="ml-1 flex items-center gap-1 rounded-full transition-opacity hover:opacity-90"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#6d3bd6]">
            <User className="size-5" />
          </span>
          <ChevronDown className="size-4" />
        </button>
      </div>
    </header>
  );
}
