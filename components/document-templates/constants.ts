export const PAGE_WIDTH: Record<string, string> = {
  A4: "794px",
  Letter: "816px",
  Legal: "816px",
  A5: "559px",
};

export const MARGIN_PADDING: Record<string, string> = {
  normal: "40px",
  narrow: "20px",
  wide: "64px",
};

export const FONT_FAMILY: Record<string, string> = {
  inter: "'Inter', 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

/** Apply alpha (0–1) to a #RRGGBB theme color for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function fmtDocDate(dateStr: string | null | undefined, style: "short" | "gb" = "gb") {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (style === "short") return d.toLocaleDateString();
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
