"use client";

import type { ReactNode } from "react";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow } from "./types";
import { FONT_FAMILY, MARGIN_PADDING, PAGE_WIDTH } from "./constants";

type PreviewShellProps = {
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  children: ReactNode;
  className?: string;
};

export function PreviewShell({
  settings,
  bs,
  themeColor,
  children,
  className = "quotation-print-area relative mx-auto bg-white shadow-lg print:shadow-none",
}: PreviewShellProps) {
  const fontFamily = FONT_FAMILY[settings.fontFamily] || FONT_FAMILY.inter;
  const pageWidth = PAGE_WIDTH[settings.pageSize] || PAGE_WIDTH.A4;
  const padding = MARGIN_PADDING[settings.margin] || MARGIN_PADDING.normal;

  return (
    <div
      className={className}
      style={{
        width: pageWidth,
        // minHeight: "1123px", // hieght issue
        padding,
        fontFamily,
        fontSize: "13px",
        color: "#111",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {settings.showWatermark && (
        <div
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
          style={{ zIndex: 0, opacity: settings.watermarkOpacity ?? 0.15 }}
          aria-hidden
        >
          {bs.watermarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bs.watermarkUrl}
              alt=""
              className="max-h-xs max-w-xs object-contain"
            />
          ) : (
            <span
              className="rotate-[-30deg] text-6xl font-extrabold uppercase tracking-widest"
              style={{ color: themeColor }}
            >
              {bs.watermarkText || "DRAFT"}
            </span>
          )}
        </div>
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function getPreviewStyles(settings: QuotationSettings) {
  return {
    fontFamily: FONT_FAMILY[settings.fontFamily] || FONT_FAMILY.inter,
    pageWidth: PAGE_WIDTH[settings.pageSize] || PAGE_WIDTH.A4,
    padding: MARGIN_PADDING[settings.margin] || MARGIN_PADDING.normal,
  };
}
