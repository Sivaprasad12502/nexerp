import type { QuotationSettings } from "@/lib/validations/quotation";
import type { BusinessSettingsRow } from "./types";

type BankUpiFooterProps = {
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
  compact?: boolean;
};

export function BankUpiFooter({ settings, bs, themeColor, compact = false }: BankUpiFooterProps) {
  const showBank =
    settings.showBankDetails && (bs.bankName || bs.bankAccountNumber || bs.bankIfsc);
  const showUpi = settings.showUpiDetails && (bs.upiId || bs.upiQrUrl);

  if (!showBank && !showUpi) return null;

  return (
    <div className={compact ? "space-y-3" : "mt-5 space-y-3"}>
      {showBank && (
        <div className="rounded border border-zinc-200 p-4">
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
            {bs.bankAccountName && (
              <div>
                <span className="text-zinc-400">Account Name: </span>
                {bs.bankAccountName}
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
            {bs.bankBranch && (
              <div>
                <span className="text-zinc-400">Branch: </span>
                {bs.bankBranch}
              </div>
            )}
            {bs.bankSwift && (
              <div>
                <span className="text-zinc-400">SWIFT: </span>
                {bs.bankSwift}
              </div>
            )}
          </div>
        </div>
      )}

      {showUpi && (
        <div className="flex items-start gap-4 rounded border border-zinc-200 p-4">
          <div>
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
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
              className="h-20 w-20 rounded border border-zinc-200 object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Bank + UPI block sized for split footer layout (left column). */
export function BankUpiCompact({
  settings,
  bs,
  themeColor,
}: {
  settings: QuotationSettings;
  bs: BusinessSettingsRow;
  themeColor: string;
}) {
  const showBank =
    settings.showBankDetails && (bs.bankName || bs.bankAccountNumber || bs.bankIfsc);
  const showUpi = settings.showUpiDetails && (bs.upiId || bs.upiQrUrl);

  if (!showBank && !showUpi) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex-1 space-y-3 pr-6">
      {showBank && (
        <div>
          <p
            className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: themeColor }}
          >
            Bank Details
          </p>
          <div className="space-y-0.5 text-xs text-zinc-700">
            {bs.bankName && (
              <p>
                <span className="text-zinc-400">Bank: </span>
                {bs.bankName}
              </p>
            )}
            {bs.bankAccountNumber && (
              <p>
                <span className="text-zinc-400">A/C: </span>
                {bs.bankAccountNumber}
              </p>
            )}
            {bs.bankIfsc && (
              <p>
                <span className="text-zinc-400">IFSC: </span>
                {bs.bankIfsc}
              </p>
            )}
          </div>
        </div>
      )}
      {showUpi && (
        <div className="flex items-start gap-3">
          <div>
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-wide"
              style={{ color: themeColor }}
            >
              UPI
            </p>
            {bs.upiId && <p className="text-xs text-zinc-700">{bs.upiId}</p>}
          </div>
          {bs.upiQrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bs.upiQrUrl}
              alt="UPI QR"
              className="h-16 w-16 rounded border border-zinc-200 object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}
