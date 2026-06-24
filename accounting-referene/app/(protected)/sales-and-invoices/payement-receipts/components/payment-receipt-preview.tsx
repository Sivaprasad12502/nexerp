"use client";

import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type { PaymentReceiptPreviewData } from "@/lib/payment-receipt-preview-adapter";
import { receiptStatusBadge } from "@/lib/payment-receipt-preview-adapter";
import { numberToWords } from "@/lib/quotation-utils";
import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow } from "../../quotation-estimates/components/quotation-preview";

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

type Props = {
  receipt: PaymentReceiptPreviewData;
  settings: QuotationSettings;
  businessSettings: BusinessSettingsRow;
  numberFormat: string;
  decimalDigits: number;
  customCurrencySymbol?: string | null;
};

type HeaderProps = {
  receipt: PaymentReceiptPreviewData;
  badge: string;
  themeColor: string;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Letterhead({ settings, bs }: { settings: QuotationSettings; bs: BusinessSettingsRow }) {
  if (!settings.showLetterhead || !bs.letterheadUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bs.letterheadUrl}
      alt="Letterhead"
      className="mb-4 max-h-24 w-full object-contain"
    />
  );
}

function StatusBadge({ badge }: { badge: string }) {
  return (
    <span className="rounded bg-orange-400 px-2 py-0.5 text-xs font-semibold text-white">
      {badge}
    </span>
  );
}

function ProfessionalReceiptHeader({ receipt, badge, themeColor, settings, bs }: HeaderProps) {
  return (
    <>
      <Letterhead settings={settings} bs={bs} />
      <div
        className="mb-6 flex items-start justify-between rounded-lg px-6 py-5"
        style={{ backgroundColor: themeColor }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Payment Receipt</h1>
            <StatusBadge badge={badge} />
          </div>
          <div className="mt-3 space-y-0.5 text-xs text-white/90">
            <div>
              <span className="opacity-70">Payment Receipt No: </span>
              <strong>{receipt.receiptNumber}</strong>
            </div>
            <div>
              <span className="opacity-70">Receipt Date: </span>
              <strong>{fmtDate(receipt.receiptDate)}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ModernReceiptHeader({ receipt, badge, themeColor, settings, bs }: HeaderProps) {
  return (
    <>
      <Letterhead settings={settings} bs={bs} />
      <div
        className="mb-6 flex items-center justify-between border-b-2 pb-4"
        style={{ borderColor: themeColor }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: themeColor }}>
              Payment Receipt
            </h1>
            <StatusBadge badge={badge} />
          </div>
        </div>
        <div className="space-y-1 text-right text-sm text-zinc-600">
          <div>
            <span className="mr-2 text-zinc-400">Payment Receipt No:</span>
            <strong className="text-zinc-900">{receipt.receiptNumber}</strong>
          </div>
          <div>
            <span className="mr-2 text-zinc-400">Receipt Date:</span>
            <span>{fmtDate(receipt.receiptDate)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function SimpleReceiptHeader({ receipt, badge, settings, bs }: HeaderProps) {
  return (
    <>
      <Letterhead settings={settings} bs={bs} />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">Payment Receipt</h1>
            <StatusBadge badge={badge} />
          </div>
        </div>
        <div className="text-right text-sm text-zinc-600">
          <p>
            <span className="text-zinc-400">#{receipt.receiptNumber}</span>
          </p>
          <p className="mt-1">{fmtDate(receipt.receiptDate)}</p>
        </div>
      </div>
    </>
  );
}

function ClassicReceiptHeader({ receipt, badge, themeColor, settings, bs }: HeaderProps) {
  return (
    <>
      <Letterhead settings={settings} bs={bs} />
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <h1
            className="text-3xl font-bold uppercase tracking-widest"
            style={{ color: themeColor }}
          >
            Payment Receipt
          </h1>
          <StatusBadge badge={badge} />
        </div>
        <div className="mt-3 flex justify-center gap-8 text-sm text-zinc-600">
          <span>
            No. <strong>{receipt.receiptNumber}</strong>
          </span>
          <span>{fmtDate(receipt.receiptDate)}</span>
        </div>
        <hr className="mt-4 border-zinc-300" />
      </div>
    </>
  );
}

type BodyProps = {
  receipt: PaymentReceiptPreviewData;
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  fmt: (n: number) => string;
};

function ReceiptPreviewBody({ receipt, settings, bs, themeColor, fmt }: BodyProps) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded border border-zinc-200 p-4">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: themeColor }}
          >
            Issued by
          </p>
          {receipt.issuedByName && (
            <p className="text-sm font-semibold">{receipt.issuedByName}</p>
          )}
          {receipt.issuedByCountry && (
            <p className="mt-1 text-xs text-zinc-600">{receipt.issuedByCountry}</p>
          )}
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: themeColor }}
          >
            Issued to
          </p>
          {receipt.issuedToName && (
            <p className="text-sm font-semibold">{receipt.issuedToName}</p>
          )}
          {receipt.issuedToCountry && (
            <p className="mt-1 text-xs text-zinc-600">{receipt.issuedToCountry}</p>
          )}
        </div>
      </div>

      <table className="mb-0 w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: `${themeColor}15` }}>
            <th
              className="border-b px-3 py-2 text-left text-xs font-semibold"
              style={{ color: themeColor, borderColor: `${themeColor}30` }}
            >
              Payment Method
            </th>
            <th
              className="border-b px-3 py-2 text-right text-xs font-semibold"
              style={{ color: themeColor, borderColor: `${themeColor}30` }}
            >
              Amount Received
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="px-3 py-2.5">
                {line.methodLabel}
                {line.paymentAccountName && (
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {line.paymentAccountName}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-medium">{fmt(line.amountReceived)}</td>
            </tr>
          ))}
          <tr className="font-semibold" style={{ backgroundColor: `${themeColor}08` }}>
            <td className="px-3 py-2.5">Total</td>
            <td className="px-3 py-2.5 text-right">{fmt(receipt.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-md flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Total amount (in words)
          </p>
          <p className="mt-1 text-sm italic text-zinc-700">
            {numberToWords(receipt.totalAmount, receipt.currency)}
          </p>
        </div>

        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Total Amount Received</span>
            <span>{fmt(receipt.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Payment Surplus</span>
            <span>{fmt(receipt.paymentSurplus)}</span>
          </div>
          <div
            className="flex justify-between border-t pt-2 text-base font-bold"
            style={{ borderColor: themeColor, color: themeColor }}
          >
            <span>Total Amount</span>
            <span>{fmt(receipt.totalAmount)}</span>
          </div>
        </div>
      </div>

      {settings.showBankDetails && (bs.bankName || bs.bankAccountNumber || bs.bankIfsc) && (
        <div className="mt-5 rounded border border-zinc-200 p-4">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: themeColor }}
          >
            Bank Details
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-700">
            {bs.bankName && (
              <div>
                <span className="text-zinc-400">Bank: </span>
                {bs.bankName}
              </div>
            )}
            {bs.bankAccountNumber && (
              <div>
                <span className="text-zinc-400">Account No: </span>
                {bs.bankAccountNumber}
              </div>
            )}
            {bs.bankIfsc && (
              <div>
                <span className="text-zinc-400">IFSC: </span>
                {bs.bankIfsc}
              </div>
            )}
          </div>
        </div>
      )}

      {(receipt.notes || receipt.additionalInfo || receipt.contactDetails) && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {receipt.notes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">{receipt.notes}</p>
            </div>
          )}
          {receipt.additionalInfo && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Additional Info
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">
                {receipt.additionalInfo}
              </p>
            </div>
          )}
          {receipt.contactDetails && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Contact
              </p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600">
                {receipt.contactDetails}
              </p>
            </div>
          )}
        </div>
      )}

      {receipt.signature && (
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receipt.signature}
              alt="Signature"
              className="mb-1 h-14 object-contain"
            />
            <div className="border-t border-zinc-300 pt-1 text-xs text-zinc-500">
              Authorized Signature
            </div>
          </div>
        </div>
      )}

      {settings.showFooter && bs.footerText && (
        <div className="mt-6 whitespace-pre-wrap border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
          {bs.footerText}
        </div>
      )}
    </>
  );
}

export function PaymentReceiptPreview({
  receipt,
  settings,
  businessSettings: bs,
  numberFormat,
  decimalDigits,
  customCurrencySymbol,
}: Props) {
  const themeColor = settings.themeColor || "#7438dc";
  const formatOpts = {
    currency: receipt.currency,
    numberFormat,
    decimalDigits,
    customCurrencySymbol: customCurrencySymbol ?? null,
  };
  const fmt = (n: number) => formatReceiptAmount(n, formatOpts);
  const badge = receiptStatusBadge(receipt.status, receipt.type);

  const headerProps: HeaderProps = { receipt, badge, themeColor, settings, bs };

  return (
    <div
      className="quotation-print-area mx-auto bg-white shadow-lg ring-1 ring-zinc-200"
      style={{
        width: PAGE_WIDTH[settings.pageSize] ?? PAGE_WIDTH.A4,
        fontFamily: FONT_FAMILY[settings.fontFamily] ?? FONT_FAMILY.inter,
        padding: MARGIN_PADDING[settings.margin] ?? MARGIN_PADDING.normal,
        position: "relative",
      }}
    >
      {settings.showWatermark && (bs.watermarkUrl || bs.watermarkText) && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ opacity: settings.watermarkOpacity ?? 0.15 }}
        >
          {bs.watermarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bs.watermarkUrl} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="rotate-[-30deg] text-6xl font-bold text-zinc-400">
              {bs.watermarkText}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        {settings.template === "modern" ? (
          <ModernReceiptHeader {...headerProps} />
        ) : settings.template === "simple" ? (
          <SimpleReceiptHeader {...headerProps} />
        ) : settings.template === "classic" ? (
          <ClassicReceiptHeader {...headerProps} />
        ) : (
          <ProfessionalReceiptHeader {...headerProps} />
        )}

        <ReceiptPreviewBody
          receipt={receipt}
          settings={settings}
          bs={bs}
          themeColor={themeColor}
          fmt={fmt}
        />
      </div>
    </div>
  );
}

// Re-export for settings panel payment records list
export { METHOD_LABELS } from "@/components/shared/payment-form-fields";
