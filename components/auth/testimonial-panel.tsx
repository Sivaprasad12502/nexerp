import { Star } from "lucide-react";

export function TestimonialPanel() {
  return (
    <div className="mx-auto w-full max-w-[440px] rounded-2xl bg-[#f4f0fc] p-5 sm:p-6">
      {/* Quote card */}
      <div className="relative rounded-xl bg-white px-6 py-7 shadow-sm">
        <span className="pointer-events-none absolute left-4 top-1 select-none font-serif text-6xl leading-none text-[#e6def8]">
          &ldquo;
        </span>
        <span className="pointer-events-none absolute bottom-[-10px] right-5 select-none font-serif text-6xl leading-none text-[#e6def8]">
          &rdquo;
        </span>

        <div className="relative flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-base font-semibold text-white">
            VK
          </div>
          <p className="mt-3 font-semibold text-zinc-900">Vitesh Kohli</p>
          <p className="text-xs text-zinc-500">CEO, Drisya Pvt Ltd</p>

          <div className="mt-2 flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            &ldquo;Thanks to{" "}
            <span className="font-medium text-[#7c3aed]">Refrens</span>, we&apos;ve been
            able to focus more on our growth and customer relationships rather than being
            bogged down by operational hassles.&rdquo;
          </p>
        </div>
      </div>

      {/* Start for free */}
      <div className="mt-6 text-center">
        <p className="font-semibold text-zinc-900">Start for free</p>
        <p className="mt-1 text-xs text-zinc-500">
          Free trial to get started. No credit card required. Cancel anytime.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Over 150k+ businesses across 170+ countries love us.
          <br />
          You will too!
        </p>
      </div>

      {/* Award badges */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <ShieldBadge top="Capterra" mid="BEST EASE OF USE" year="2025" tone="navy" />
        <ShieldBadge top="Software Advice" mid="Highest Rated" year="2025" tone="light" />
        <RibbonBadge />
        <ShieldBadge top="GetApp" mid="CATEGORY LEADERS" year="2025" tone="navy" />
      </div>

      <div className="mt-4 flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <SealIcon />
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-800">Certified</p>
            <p className="text-[11px] text-zinc-500">27001:2022</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon />
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-800">100%</p>
            <p className="text-[11px] text-zinc-500">Safe &amp; Secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldBadge({
  top,
  mid,
  year,
  tone,
}: {
  top: string;
  mid: string;
  year: string;
  tone: "navy" | "light";
}) {
  const navy = tone === "navy";
  return (
    <div
      className={`flex h-16 w-16 flex-col items-center justify-center rounded-md px-1 text-center ${
        navy ? "bg-[#1e2a44] text-white" : "border border-zinc-200 bg-white text-zinc-700"
      }`}
      style={{
        clipPath:
          "polygon(50% 0, 100% 14%, 100% 70%, 50% 100%, 0 70%, 0 14%)",
      }}
    >
      <span className="text-[7px] font-semibold uppercase opacity-80">{top}</span>
      <span className="mt-0.5 text-[7px] font-bold uppercase leading-tight">{mid}</span>
      <span
        className={`mt-0.5 text-[7px] font-semibold ${navy ? "text-amber-300" : "text-[#7c3aed]"}`}
      >
        {year}
      </span>
    </div>
  );
}

function RibbonBadge() {
  return (
    <div className="flex h-16 w-12 flex-col items-center justify-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#e11d48] to-[#9f1239] text-white shadow-sm">
        <Star className="size-4 fill-white text-white" />
      </div>
      <div className="-mt-1 flex gap-1">
        <span className="h-4 w-1.5 skew-x-6 bg-[#9f1239]" />
        <span className="h-4 w-1.5 -skew-x-6 bg-[#e11d48]" />
      </div>
    </div>
  );
}

function SealIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
      <circle cx="20" cy="20" r="16" className="fill-[#eef2ff] stroke-[#3b5bdb]" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" className="fill-none stroke-[#3b5bdb]" strokeWidth="0.8" />
      <text x="20" y="24" textAnchor="middle" className="fill-[#3b5bdb] text-[9px] font-bold">
        ISO
      </text>
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 40 44" className="size-9" aria-hidden>
      <path
        d="M20 2 4 8v12c0 10 7 16 16 20 9-4 16-10 16-20V8L20 2Z"
        className="fill-[#16a34a]"
      />
      <path
        d="m14 22 4 4 8-8"
        className="fill-none stroke-white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
