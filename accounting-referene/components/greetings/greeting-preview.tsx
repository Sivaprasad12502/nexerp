"use client";

import { forwardRef } from "react";

import type { GreetingTemplate } from "@/lib/greeting-templates";

type GreetingPreviewProps = {
  template: GreetingTemplate;
  businessName: string;
  removeBranding: boolean;
  logoUrl: string | null;
};

export const GreetingPreview = forwardRef<HTMLDivElement, GreetingPreviewProps>(
  function GreetingPreview(
    { template, businessName, removeBranding, logoUrl },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="relative mx-auto aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-lg bg-zinc-100 shadow-md ring-1 ring-zinc-200"
      >
        {/* Fallback gradient — z-0 so a loaded template image renders on top */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#b91c1c] via-[#dc2626] to-[#991b1b]" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.imagePath}
          alt={template.label}
          className="absolute inset-0 z-[1] size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {logoUrl && (
          <div className="absolute left-4 top-4 z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Business logo"
              className="max-h-14 max-w-[120px] rounded bg-white/90 object-contain p-1 shadow-sm"
            />
          </div>
        )}

        {businessName.trim() && (
          <p className="absolute bottom-4 left-4 z-10 text-lg font-semibold text-white drop-shadow-md">
            {businessName.trim()}
          </p>
        )}

        {!removeBranding && (
          <p className="absolute bottom-4 right-4 z-10 text-[10px] text-white/90 drop-shadow-sm">
            Proud Member of Refrens.com
          </p>
        )}
      </div>
    );
  },
);
