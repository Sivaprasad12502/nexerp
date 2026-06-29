"use client";

import type { ReactNode } from "react";
import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type { PaymentReceiptPreviewData } from "@/lib/payment-receipt-preview-adapter";
import { receiptStatusBadge } from "@/lib/payment-receipt-preview-adapter";
import { numberToWords } from "@/lib/quotation-utils";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { PreviewShell } from "@/components/document-templates/preview-shell";
import {
  ClassicReceiptHeader,
  ModernReceiptHeader,
  ProfessionalReceiptHeader,
  SimpleReceiptHeader,
} from "@/components/document-templates/quotation-headers";
import type { BusinessSettingsRow } from "@/components/document-templates/types";

type Props = {
  receipt: PaymentReceiptPreviewData;
  settings: QuotationSettings;
  businessSettings: BusinessSettingsRow;
  numberFormat: string;
  decimalDigits: number;
  customCurrencySymbol?: string | null;
  children?: ReactNode;
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ badge }: { badge: string }) {
  const isSettled = badge === "Settled";
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${
        isSettled ? "bg-emerald-500" : "bg-orange-400"
      }`}
    >
      {badge}
    </span>
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
          <tr style={{ backgroundColor: themeColor }}>
            <th className="px-3 py-2 text-left text-xs font-semibold text-white">
              Payment Method
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-white">
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
          <tr className="font-semibold" style={{ backgroundColor: `${themeColor}15` }}>
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
  children,
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
  const badgeNode = <StatusBadge badge={badge} />;
  const date = fmtDate(receipt.receiptDate);

  const headerProps = {
    title: "Payment Receipt",
    numberLabel: "Payment Receipt No",
    number: receipt.receiptNumber,
    date,
    settings,
    bs,
    themeColor,
    badge: badgeNode,
  };

  return (
    <PreviewShell
      settings={settings}
      bs={bs}
      themeColor={themeColor}
      className="quotation-print-area mx-auto bg-white shadow-lg ring-1 ring-zinc-200 print:shadow-none"
    >
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

      {children}
    </PreviewShell>
  );
}

export { METHOD_LABELS } from "@/components/shared/payment-form-fields";
