"use client";

import { calcTotals, numberToWords } from "@/lib/quotation-utils";
import type { QuotationRow } from "./quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessSettingsRow = {
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  bankSwift?: string | null;
  upiId?: string | null;
  upiQrUrl?: string | null;
  letterheadUrl?: string | null;
  footerText?: string | null;
  watermarkText?: string | null;
  watermarkUrl?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_WIDTH: Record<string, string> = {
  A4: "794px",
  Letter: "816px",
  Legal: "816px",
  A5: "559px",
};

const MARGIN_PADDING: Record<string, string> = {
  normal: "40px",
  narrow: "20px",
  wide: "64px",
};

const FONT_FAMILY: Record<string, string> = {
  inter: "'Inter', 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

// ─── Template header renderers ────────────────────────────────────────────────

function ProfessionalHeader({
  q,
  themeColor,
  settings,
  bs,
  documentLabel,
}: {
  q: QuotationRow;
  themeColor: string;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  documentLabel: string;
}) {
  return (
    <>
      {/* Letterhead */}
      {settings.showLetterhead && bs.letterheadUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bs.letterheadUrl}
          alt="Letterhead"
          className="w-full mb-4 object-contain max-h-24"
        />
      )}

      {/* Header band */}
      <div
        className="flex items-start justify-between rounded-lg px-6 py-5 mb-6"
        style={{ backgroundColor: themeColor }}
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            {q.quotationTitle || documentLabel}
          </h1>
          {q.subtitle && (
            <p className="text-sm text-white/80 mt-0.5">{q.subtitle}</p>
          )}
          <div className="mt-3 space-y-0.5 text-xs text-white/90">
            <div className="flex gap-6">
              <span>
                <span className="opacity-70">No. </span>
                <strong>{q.quotationNumber}</strong>
              </span>
              <span>
                <span className="opacity-70">Date </span>
                <strong>
                  {q.quotationDate
                    ? new Date(q.quotationDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </strong>
              </span>
              {q.validTillDate && (
                <span>
                  <span className="opacity-70">Valid Till </span>
                  <strong>
                    {new Date(q.validTillDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          {q.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.logo}
              alt="Logo"
              className="h-16 w-24 object-contain rounded bg-white/10 p-1"
            />
          ) : (
            <div className="h-16 w-24 rounded bg-white/20 flex items-center justify-center text-white/50 text-xs">
              Logo
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ModernHeader({
  q,
  themeColor,
  settings,
  bs,
  documentLabel,
}: {
  q: QuotationRow;
  themeColor: string;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  documentLabel: string;
}) {
  return (
    <>
      {settings.showLetterhead && bs.letterheadUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bs.letterheadUrl}
          alt="Letterhead"
          className="w-full mb-4 object-contain max-h-24"
        />
      )}
      <div className="flex items-center justify-between mb-6 border-b-2 pb-4" style={{ borderColor: themeColor }}>
        <div>
          {q.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.logo} alt="Logo" className="h-12 object-contain mb-2" />
          )}
          <h1 className="text-xl font-bold" style={{ color: themeColor }}>
            {q.quotationTitle || documentLabel}
          </h1>
          {q.subtitle && <p className="text-xs text-zinc-500">{q.subtitle}</p>}
        </div>
        <div className="text-right text-sm text-zinc-600 space-y-1">
          <div>
            <span className="text-zinc-400 mr-2">{documentLabel} No:</span>
            <strong className="text-zinc-900">{q.quotationNumber}</strong>
          </div>
          <div>
            <span className="text-zinc-400 mr-2">Date:</span>
            <span>
              {q.quotationDate
                ? new Date(q.quotationDate).toLocaleDateString()
                : "—"}
            </span>
          </div>
          {q.validTillDate && (
            <div>
              <span className="text-zinc-400 mr-2">Valid Till:</span>
              <span>{new Date(q.validTillDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SimpleHeader({
  q,
  settings,
  bs,
  documentLabel,
}: {
  q: QuotationRow;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  documentLabel: string;
}) {
  return (
    <>
      {settings.showLetterhead && bs.letterheadUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bs.letterheadUrl}
          alt="Letterhead"
          className="w-full mb-4 object-contain max-h-24"
        />
      )}
      <div className="mb-6 flex justify-between items-start">
        <div>
          {q.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.logo} alt="Logo" className="h-10 object-contain mb-3" />
          )}
          <h1 className="text-2xl font-semibold text-zinc-900">
            {q.quotationTitle || documentLabel}
          </h1>
          {q.subtitle && <p className="text-sm text-zinc-500 mt-1">{q.subtitle}</p>}
        </div>
        <div className="text-sm text-zinc-600 text-right">
          <p><span className="text-zinc-400">#{q.quotationNumber}</span></p>
          <p className="mt-1">
            {q.quotationDate ? new Date(q.quotationDate).toLocaleDateString() : ""}
          </p>
          {q.validTillDate && (
            <p className="text-xs text-zinc-400">
              Valid till {new Date(q.validTillDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ClassicHeader({
  q,
  themeColor,
  settings,
  bs,
  documentLabel,
}: {
  q: QuotationRow;
  themeColor: string;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  documentLabel: string;
}) {
  return (
    <>
      {settings.showLetterhead && bs.letterheadUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bs.letterheadUrl}
          alt="Letterhead"
          className="w-full mb-4 object-contain max-h-24"
        />
      )}
      <div className="text-center mb-6">
        {q.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.logo} alt="Logo" className="h-14 object-contain mx-auto mb-3" />
        )}
        <h1 className="text-3xl font-bold tracking-widest uppercase" style={{ color: themeColor }}>
          {q.quotationTitle || documentLabel}
        </h1>
        {q.subtitle && <p className="text-sm text-zinc-500 mt-1">{q.subtitle}</p>}
        <div className="mt-3 flex justify-center gap-8 text-sm text-zinc-600">
          <span>No. <strong>{q.quotationNumber}</strong></span>
          <span>
            {q.quotationDate ? new Date(q.quotationDate).toLocaleDateString() : ""}
          </span>
          {q.validTillDate && (
            <span>Valid Till {new Date(q.validTillDate).toLocaleDateString()}</span>
          )}
        </div>
        <hr className="mt-4 border-zinc-300" />
      </div>
    </>
  );
}

// ─── Main Preview Component ───────────────────────────────────────────────────

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
  const fontFamily = FONT_FAMILY[settings.fontFamily] || FONT_FAMILY.inter;
  const pageWidth = PAGE_WIDTH[settings.pageSize] || PAGE_WIDTH.A4;
  const padding = MARGIN_PADDING[settings.margin] || MARGIN_PADDING.normal;

  // Compute totals from items
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

  // Number formatter
  const fmt = (n: number) =>
    n.toLocaleString(settings.numberFormat || "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Table header color style
  const tableHeaderStyle = {
    backgroundColor: themeColor,
    color: "#fff",
  };

  return (
    <div
      className="quotation-print-area relative mx-auto bg-white shadow-lg print:shadow-none"
      style={{
        width: pageWidth,
        minHeight: "1123px",
        padding,
        fontFamily,
        fontSize: "13px",
        color: "#111",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Watermark */}
      {settings.showWatermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 0, opacity: settings.watermarkOpacity ?? 0.15 }}
          aria-hidden
        >
          {bs.watermarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bs.watermarkUrl}
              alt=""
              className="max-w-xs max-h-xs object-contain"
            />
          ) : (
            <span
              className="text-6xl font-extrabold uppercase tracking-widest rotate-[-30deg]"
              style={{ color: themeColor }}
            >
              {bs.watermarkText || "DRAFT"}
            </span>
          )}
        </div>
      )}

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Template Header ── */}
        {settings.template === "modern" ? (
          <ModernHeader q={q} themeColor={themeColor} settings={settings} bs={bs} documentLabel={documentLabel} />
        ) : settings.template === "simple" ? (
          <SimpleHeader q={q} settings={settings} bs={bs} documentLabel={documentLabel} />
        ) : settings.template === "classic" ? (
          <ClassicHeader q={q} themeColor={themeColor} settings={settings} bs={bs} documentLabel={documentLabel} />
        ) : (
          <ProfessionalHeader q={q} themeColor={themeColor} settings={settings} bs={bs} documentLabel={documentLabel} />
        )}

        {/* ── From / For ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: themeColor }}>
              {documentLabel} From
            </p>
            {q.fromName && <p className="font-semibold text-sm">{q.fromName}</p>}
            {q.fromAddress && (
              <p className="text-xs text-zinc-600 mt-1 whitespace-pre-wrap">{q.fromAddress}</p>
            )}
            {q.fromGstin && (
              <p className="text-xs text-zinc-500 mt-1">GSTIN: {q.fromGstin}</p>
            )}
            {q.fromPan && (
              <p className="text-xs text-zinc-500">PAN: {q.fromPan}</p>
            )}
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: themeColor }}>
              {documentLabel} For
            </p>
            {q.clientName && <p className="font-semibold text-sm">{q.clientName}</p>}
            {q.clientAddress && (
              <p className="text-xs text-zinc-600 mt-1 whitespace-pre-wrap">{q.clientAddress}</p>
            )}
            {q.clientGstin && (
              <p className="text-xs text-zinc-500 mt-1">GSTIN / TRN: {q.clientGstin}</p>
            )}
          </div>
        </div>

        {/* ── Custom Fields ── */}
        {(q.customFields ?? []).length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
            {q.customFields.map((cf, i) => (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span className="text-zinc-500">{cf.label}:</span>
                <span className="text-zinc-800 font-medium">{cf.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Items Table ── */}
        <table className="w-full mb-0 text-xs border-collapse">
          <thead>
            <tr style={tableHeaderStyle}>
              <th className="py-2 pl-3 pr-2 text-left font-semibold">#. Item</th>
              {settings.showSku && (
                <th className="px-2 py-2 text-left font-semibold">SKU</th>
              )}
              <th className="px-2 py-2 text-right font-semibold">Tax%</th>
              <th className="px-2 py-2 text-right font-semibold">Qty</th>
              {settings.displayUnitAs !== "doNotShow" && settings.displayUnitAs !== "mergeWithName" && (
                <th className="px-2 py-2 text-left font-semibold">Unit</th>
              )}
              <th className="px-2 py-2 text-right font-semibold">Rate</th>
              <th className="px-2 py-2 text-right font-semibold">Amount</th>
              <th className="px-2 py-2 text-right font-semibold">TAX</th>
              <th className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((item, i) => {
              // Group row
              if (item.groupName) {
                return (
                  <tr key={item.id} className="bg-zinc-50">
                    <td
                      colSpan={9}
                      className="py-1.5 pl-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: themeColor }}
                    >
                      {item.groupName}
                    </td>
                  </tr>
                );
              }
              const rowBg = i % 2 === 0 ? "#fff" : "#f9f9fb";
              return (
                <tr key={item.id} style={{ backgroundColor: rowBg }}>
                  <td className="py-2 pl-3 pr-2 align-top">
                    <div className="flex gap-2">
                      {settings.showThumbnails && item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-8 w-8 rounded object-cover border border-zinc-200 flex-shrink-0"
                        />
                      )}
                      <div>
                        <span className="text-zinc-400 mr-1">{i + 1}.</span>
                        <span className="font-medium text-zinc-900">
                          {item.name}
                          {settings.displayUnitAs === "mergeWithName" && item.unit
                            ? ` (${item.unit})`
                            : ""}
                        </span>
                        {item.description && (
                          <p
                            className={`text-zinc-500 mt-0.5 ${
                              settings.showFullWidthDescription
                                ? "col-span-full"
                                : "text-xs"
                            }`}
                          >
                            {item.description}
                          </p>
                        )}
                        {settings.showSku && item.sku && (
                          <span className="hidden text-zinc-400"> – {item.sku}</span>
                        )}
                        {item.hsnSac && settings.showHsnSummary === false && (
                          <p className="text-zinc-400 text-[10px]">HSN: {item.hsnSac}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {settings.showSku && (
                    <td className="px-2 py-2 text-zinc-600 align-top">{item.sku ?? "—"}</td>
                  )}
                  <td className="px-2 py-2 text-right text-zinc-600 align-top">
                    {item.taxRate ?? 0}%
                  </td>
                  <td className="px-2 py-2 text-right text-zinc-700 font-medium align-top">
                    {settings.displayUnitAs === "mergeWithQuantity" && item.unit
                      ? `${item.quantity} ${item.unit}`
                      : item.quantity}
                  </td>
                  {settings.displayUnitAs !== "doNotShow" && settings.displayUnitAs !== "mergeWithName" && (
                    <td className="px-2 py-2 text-zinc-600 align-top">{item.unit ?? ""}</td>
                  )}
                  <td className="px-2 py-2 text-right text-zinc-700 align-top">
                    {q.currency} {fmt(item.rate)}
                  </td>
                  <td className="px-2 py-2 text-right text-zinc-700 align-top">
                    {fmt(item.amount)}
                  </td>
                  <td className="px-2 py-2 text-right text-zinc-700 align-top">
                    {fmt(item.taxAmount)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-zinc-900 align-top">
                    {fmt(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── HSN Summary (optional) ── */}
        {settings.showHsnSummary && (
          <div className="mt-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              HSN / SAC Summary
            </p>
            <table className="w-full text-xs border border-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-zinc-600">HSN/SAC</th>
                  <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Taxable Amt</th>
                  <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax%</th>
                  <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax Amt</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  q.items.reduce<Record<string, { taxable: number; tax: number; rate: number }>>(
                    (acc, item) => {
                      if (!item.hsnSac || item.groupName) return acc;
                      acc[item.hsnSac] = acc[item.hsnSac] ?? {
                        taxable: 0,
                        tax: 0,
                        rate: item.taxRate,
                      };
                      acc[item.hsnSac].taxable += item.amount;
                      acc[item.hsnSac].tax += item.taxAmount;
                      return acc;
                    },
                    {},
                  ),
                ).map(([hsn, v]) => (
                  <tr key={hsn} className="border-t border-zinc-200">
                    <td className="px-3 py-1.5">{hsn}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(v.taxable)}</td>
                    <td className="px-3 py-1.5 text-right">{v.rate}%</td>
                    <td className="px-3 py-1.5 text-right">{fmt(v.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tax Summary (optional) ── */}
        {settings.showTaxSummary && (
          <div className="mt-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Tax Summary
            </p>
            <table className="w-full text-xs border border-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-zinc-600">Tax Rate</th>
                  <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Taxable Amount</th>
                  <th className="px-3 py-1.5 text-right font-medium text-zinc-600">Tax Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  q.items.reduce<Record<string, { taxable: number; tax: number }>>(
                    (acc, item) => {
                      if (item.groupName) return acc;
                      const k = `${item.taxRate}%`;
                      acc[k] = acc[k] ?? { taxable: 0, tax: 0 };
                      acc[k].taxable += item.amount;
                      acc[k].tax += item.taxAmount;
                      return acc;
                    },
                    {},
                  ),
                ).map(([rate, v]) => (
                  <tr key={rate} className="border-t border-zinc-200">
                    <td className="px-3 py-1.5">{rate}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(v.taxable)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(v.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Totals ── */}
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Amount</span>
              <span>{q.currency} {fmt(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>TAX</span>
              <span>{q.currency} {fmt(totals.totalTax)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>{q.discountLabel || "Discount"}</span>
                <span>− {q.currency} {fmt(totals.totalDiscount)}</span>
              </div>
            )}
            {(q.additionalCharges ?? []).map((c, i) => (
              <div key={i} className="flex justify-between text-zinc-600">
                <span>{c.label}</span>
                <span>{q.currency} {fmt(c.amount)}</span>
              </div>
            ))}
            <div
              className="flex justify-between border-t pt-2 text-base font-bold"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              <span>Total ({q.currency})</span>
              <span>{q.currency} {fmt(totals.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Total Qty</span>
              <span>{totals.totalQuantity}</span>
            </div>
          </div>
        </div>

        {/* ── Amount in Words ── */}
        {q.amountInWords && (
          <div className="mt-3 rounded bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs italic text-zinc-600">
            {numberToWords(totals.totalAmount, q.currency)}
          </div>
        )}

        {/* ── Bank Details ── */}
        {settings.showBankDetails &&
          (bs.bankName || bs.bankAccountNumber || bs.bankIfsc) && (
            <div className="mt-5 rounded border border-zinc-200 p-4">
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: themeColor }}
              >
                Bank Details
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-700">
                {bs.bankName && (
                  <div><span className="text-zinc-400">Bank: </span>{bs.bankName}</div>
                )}
                {bs.bankAccountName && (
                  <div><span className="text-zinc-400">Account Name: </span>{bs.bankAccountName}</div>
                )}
                {bs.bankAccountNumber && (
                  <div><span className="text-zinc-400">Account No: </span>{bs.bankAccountNumber}</div>
                )}
                {bs.bankIfsc && (
                  <div><span className="text-zinc-400">IFSC: </span>{bs.bankIfsc}</div>
                )}
                {bs.bankBranch && (
                  <div><span className="text-zinc-400">Branch: </span>{bs.bankBranch}</div>
                )}
                {bs.bankSwift && (
                  <div><span className="text-zinc-400">SWIFT: </span>{bs.bankSwift}</div>
                )}
              </div>
            </div>
          )}

        {/* ── UPI Details ── */}
        {settings.showUpiDetails && (bs.upiId || bs.upiQrUrl) && (
          <div className="mt-3 rounded border border-zinc-200 p-4 flex items-start gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: themeColor }}
              >
                UPI / Pay Online
              </p>
              {bs.upiId && (
                <p className="text-xs text-zinc-700">
                  <span className="text-zinc-400">UPI ID: </span>
                  {bs.upiId}
                </p>
              )}
            </div>
            {bs.upiQrUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bs.upiQrUrl}
                alt="UPI QR"
                className="h-20 w-20 object-contain border border-zinc-200 rounded"
              />
            )}
          </div>
        )}

        {/* ── Terms / Notes / Additional Info / Contact ── */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {q.termsAndConditions && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Terms &amp; Conditions
              </p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{q.termsAndConditions}</p>
            </div>
          )}
          {q.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{q.notes}</p>
            </div>
          )}
          {q.additionalInfo && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Additional Info
              </p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{q.additionalInfo}</p>
            </div>
          )}
          {q.contactDetails && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Contact
              </p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{q.contactDetails}</p>
            </div>
          )}
        </div>

        {/* ── Signature ── */}
        {q.signature && (
          <div className="mt-6 flex justify-end">
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.signature}
                alt="Signature"
                className="h-14 object-contain mb-1"
              />
              <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-500">
                Authorized Signature
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {settings.showFooter && bs.footerText && (
          <div className="mt-6 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500 whitespace-pre-wrap">
            {bs.footerText}
          </div>
        )}
      </div>
    </div>
  );
}
