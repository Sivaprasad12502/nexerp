export function RefrensLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 40 40" className="size-7" aria-hidden>
          <defs>
            <linearGradient id="refrens-tri" x1="0" y1="40" x2="40" y2="0">
              <stop offset="0" stopColor="#6d28d9" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path
            d="M20 5 35 32H5L20 5Z"
            fill="url(#refrens-tri)"
          />
          <path d="M20 14 27 27H13L20 14Z" fill="#ffffff" fillOpacity="0.92" />
        </svg>
        <span className="text-2xl font-semibold tracking-tight text-[#6d28d9]">
          Refrens
        </span>
      </div>
    </div>
  );
}
