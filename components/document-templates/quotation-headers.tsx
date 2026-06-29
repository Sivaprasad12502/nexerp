import type { ReactNode } from "react";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow } from "./types";
import { fmtDocDate } from "./constants";
import { LetterheadBlock } from "./letterhead-block";

type HeaderBaseProps = {
  q: QuotationRow;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  documentLabel: string;
};

function LogoBlock({ q, className = "h-16 w-24" }: { q: QuotationRow; className?: string }) {
  if (q.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={q.logo} alt="Logo" className={`object-contain ${className}`} />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded border border-dashed border-zinc-200 text-xs text-zinc-400 ${className}`}
    >
      Logo
    </div>
  );
}

/** Print-friendly white header — title/meta left, logo right. */
export function ProfessionalQuotationHeader({
  q,
  settings,
  bs,
  themeColor,
  documentLabel,
}: HeaderBaseProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900" style={{ color: themeColor }}>
            {q.quotationTitle || documentLabel}
          </h1>
          {q.subtitle && <p className="mt-0.5 text-sm text-zinc-500">{q.subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600">
            <span>
              <span className="text-zinc-400">{documentLabel} No: </span>
              <strong className="text-zinc-900">{q.quotationNumber}</strong>
            </span>
            <span>
              <span className="text-zinc-400">Date: </span>
              <strong>{fmtDocDate(q.quotationDate)}</strong>
            </span>
            {q.validTillDate && (
              <span>
                <span className="text-zinc-400">Valid Till: </span>
                <strong>{fmtDocDate(q.validTillDate)}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <LogoBlock q={q} />
        </div>
      </div>
    </>
  );
}

/** Full-width colored band with company, client, and meta strip. */
export function ModernQuotationHeader({
  q,
  settings,
  bs,
  themeColor,
  documentLabel,
}: HeaderBaseProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 overflow-hidden rounded-lg" style={{ backgroundColor: themeColor }}>
        <div className="flex items-start justify-between px-6 py-5 text-white">
          <div className="flex items-start gap-4">
            {q.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.logo}
                alt="Logo"
                className="h-12 w-12 rounded bg-white/10 object-contain p-1"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{q.quotationTitle || documentLabel}</h1>
              {q.fromName && <p className="mt-1 text-sm font-medium text-white/95">{q.fromName}</p>}
              {q.fromAddress && (
                <p className="mt-0.5 max-w-xs whitespace-pre-wrap text-xs text-white/75">
                  {q.fromAddress}
                </p>
              )}
            </div>
          </div>
          <div className="max-w-[45%] text-right text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Billed To</p>
            {q.clientName && <p className="mt-1 font-semibold">{q.clientName}</p>}
            {q.clientAddress && (
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-white/80">{q.clientAddress}</p>
            )}
            {q.clientGstin && (
              <p className="mt-1 text-xs text-white/70">GSTIN: {q.clientGstin}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-1 border-t border-white/20 px-6 py-2.5 text-xs text-white/90">
          <span>
            <span className="text-white/60">{documentLabel} No: </span>
            <strong>{q.quotationNumber}</strong>
          </span>
          <span>
            <span className="text-white/60">Date: </span>
            <strong>{fmtDocDate(q.quotationDate)}</strong>
          </span>
          {q.validTillDate && (
            <span>
              <span className="text-white/60">Valid Till: </span>
              <strong>{fmtDocDate(q.validTillDate)}</strong>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/** Tax-invoice style — logo/company left, title right, metadata grid. */
export function SimpleQuotationHeader({
  q,
  settings,
  bs,
  documentLabel,
}: Omit<HeaderBaseProps, "themeColor">) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          {q.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.logo} alt="Logo" className="mb-2 h-10 object-contain" />
          )}
          {q.fromName && <p className="text-sm font-semibold text-zinc-900">{q.fromName}</p>}
          {q.fromAddress && (
            <p className="mt-0.5 max-w-xs whitespace-pre-wrap text-xs text-zinc-600">
              {q.fromAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-zinc-900">
            {q.quotationTitle || documentLabel}
          </h1>
          {q.subtitle && <p className="mt-0.5 text-xs text-zinc-500">{q.subtitle}</p>}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-3 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs">
        <div>
          <span className="text-zinc-400">{documentLabel} No</span>
          <p className="font-semibold text-zinc-900">{q.quotationNumber}</p>
        </div>
        <div>
          <span className="text-zinc-400">Date</span>
          <p className="font-semibold text-zinc-900">{fmtDocDate(q.quotationDate, "short")}</p>
        </div>
        {q.validTillDate && (
          <div>
            <span className="text-zinc-400">Valid Till</span>
            <p className="font-semibold text-zinc-900">{fmtDocDate(q.validTillDate, "short")}</p>
          </div>
        )}
        {q.fromGstin && (
          <div>
            <span className="text-zinc-400">GSTIN</span>
            <p className="font-semibold text-zinc-900">{q.fromGstin}</p>
          </div>
        )}
      </div>
    </>
  );
}

/** Centered classic title with rule. */
export function ClassicQuotationHeader({
  q,
  settings,
  bs,
  themeColor,
  documentLabel,
}: HeaderBaseProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 text-center">
        {q.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.logo} alt="Logo" className="mx-auto mb-3 h-14 object-contain" />
        )}
        <h1
          className="text-3xl font-bold uppercase tracking-widest"
          style={{ color: themeColor }}
        >
          {q.quotationTitle || documentLabel}
        </h1>
        {q.subtitle && <p className="mt-1 text-sm text-zinc-500">{q.subtitle}</p>}
        <div className="mt-3 flex justify-center gap-8 text-sm text-zinc-600">
          <span>
            No. <strong>{q.quotationNumber}</strong>
          </span>
          <span>{fmtDocDate(q.quotationDate, "short")}</span>
          {q.validTillDate && <span>Valid Till {fmtDocDate(q.validTillDate, "short")}</span>}
        </div>
        <hr className="mt-4 border-zinc-300" />
      </div>
    </>
  );
}

export type ReceiptHeaderProps = {
  title: string;
  numberLabel: string;
  number: string;
  date: string;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  badge?: ReactNode;
  logoUrl?: string | null;
};

export function ProfessionalReceiptHeader({
  title,
  numberLabel,
  number,
  date,
  settings,
  bs,
  themeColor,
  badge,
  logoUrl,
}: ReceiptHeaderProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900" style={{ color: themeColor }}>
              {title}
            </h1>
            {badge}
          </div>
          <div className="mt-3 space-y-0.5 text-xs text-zinc-600">
            <div>
              <span className="text-zinc-400">{numberLabel}: </span>
              <strong className="text-zinc-900">{number}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Receipt Date: </span>
              <strong>{date}</strong>
            </div>
          </div>
        </div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-14 w-20 object-contain" />
        )}
      </div>
    </>
  );
}

export function ModernReceiptHeader({
  title,
  numberLabel,
  number,
  date,
  settings,
  bs,
  themeColor,
  badge,
}: ReceiptHeaderProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 overflow-hidden rounded-lg" style={{ backgroundColor: themeColor }}>
        <div className="flex items-center justify-between px-6 py-5 text-white">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{title}</h1>
            {badge}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 border-t border-white/20 px-6 py-2.5 text-xs text-white/90">
          <span>
            <span className="text-white/60">{numberLabel}: </span>
            <strong>{number}</strong>
          </span>
          <span>
            <span className="text-white/60">Date: </span>
            <strong>{date}</strong>
          </span>
        </div>
      </div>
    </>
  );
}

export function SimpleReceiptHeader({
  title,
  number,
  date,
  settings,
  bs,
  badge,
}: ReceiptHeaderProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {badge}
        </div>
        <div className="text-right text-sm text-zinc-600">
          <p>
            <span className="text-zinc-400">#{number}</span>
          </p>
          <p className="mt-1">{date}</p>
        </div>
      </div>
    </>
  );
}

export function ClassicReceiptHeader({
  title,
  number,
  date,
  settings,
  bs,
  themeColor,
  badge,
}: ReceiptHeaderProps) {
  return (
    <>
      <LetterheadBlock settings={settings} bs={bs} />
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <h1
            className="text-3xl font-bold uppercase tracking-widest"
            style={{ color: themeColor }}
          >
            {title}
          </h1>
          {badge}
        </div>
        <div className="mt-3 flex justify-center gap-8 text-sm text-zinc-600">
          <span>
            No. <strong>{number}</strong>
          </span>
          <span>{date}</span>
        </div>
        <hr className="mt-4 border-zinc-300" />
      </div>
    </>
  );
}
