"use client";

import { calcTotals } from "@/lib/quotation-utils";
import { PreviewShell } from "@/components/document-templates/preview-shell";
import { QuotationDocumentLayout } from "@/components/document-templates/quotation-document-layout";
import type { BusinessSettingsRow } from "@/components/document-templates/types";
import type { QuotationRow } from "./quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";

export type { BusinessSettingsRow };

export function QuotationPreview({
  quotation,
  businessSettings,
  settings,
  documentLabel = "Quotation",
}: {
  quotation: QuotationRow;
  businessSettings: BusinessSettingsRow;
  settings: QuotationSettings;
  documentLabel?: string;
}) {
  const q = quotation;
  const bs = businessSettings;
  const themeColor = settings.themeColor || "#7438dc";

  const additionalChargesTotal = (q.additionalCharges ?? []).reduce(
    (s, c) => s + (Number(c.amount) || 0),
    0,
  );
  const totals = calcTotals({
    items: q.items.map((i) => ({
      quantity: i.quantity,
      rate: i.rate,
      discount: i.discount,
      taxRate: i.taxRate,
    })),
    discountAmount: q.discountAmount,
    additionalCharges: additionalChargesTotal,
  });

  const fmt = (n: number) =>
    n.toLocaleString(settings.numberFormat || "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <PreviewShell settings={settings} bs={bs} themeColor={themeColor}>
      <QuotationDocumentLayout
        q={q}
        settings={settings}
        bs={bs}
        themeColor={themeColor}
        documentLabel={documentLabel}
        totals={totals}
        fmt={fmt}
      />
    </PreviewShell>
  );
}
