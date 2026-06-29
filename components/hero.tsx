import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const awards = [
  { platform: "GetApp", note: "Category Leaders" },
  { platform: "GetApp", note: "User Choice" },
  { platform: "Capterra", note: "Best Ease of Use" },
  { platform: "Capterra", note: "Best Value 2023" },
  { platform: "Software Advice", note: "Highest Rated" },
  { platform: "Refrens", note: "Trusted Brand" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft purple glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-80 max-w-3xl rounded-full bg-primary/25 blur-[120px]"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
        {/* Rating badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500" />
          Rated 4.8/5 by businesses worldwide
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Smarter Way to{" "}
          <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Manage Your Business
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Trusted by 100,000+ businesses from 170+ countries.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-6 text-sm">
            <Link href="#signup">
              Try for Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-6 text-sm">
            <Link href="#demo">Get a Demo</Link>
          </Button>
        </div>

        {/* Award badges */}
        <ul className="mt-14 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {awards.map((award, i) => (
            <li
              key={i}
              className="flex w-20 flex-col items-center gap-1.5 text-center"
            >
              <svg viewBox="0 0 48 56" className="h-12 w-10" aria-hidden>
                <path
                  d="M24 2 4 11v18c0 12 9 19 20 25 11-6 20-13 20-25V11L24 2Z"
                  className="fill-primary/10 stroke-primary/40"
                  strokeWidth="1.5"
                />
                <path
                  d="m24 18 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L24 18Z"
                  className="fill-primary"
                />
              </svg>
              <span className="text-[10px] leading-tight font-semibold text-foreground">
                {award.platform}
              </span>
              <span className="text-[9px] leading-tight text-muted-foreground">
                {award.note}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
