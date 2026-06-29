"use client";

type QuotationStatus =
  | "DRAFT"
  | "SAVED"
  | "SENT"
  | "VIEWED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "PURCHASE_ORDER_CREATED";

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SAVED: "bg-green-50 text-green-700 ring-1 ring-green-200",
  SENT: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  VIEWED: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-600 ring-1 ring-red-200",
  CANCELLED: "bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200",
  PURCHASE_ORDER_CREATED: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SAVED: "Saved",
  SENT: "Sent",
  VIEWED: "Viewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  PURCHASE_ORDER_CREATED: "Purchase Order Created",
};

type Props = {
  status: QuotationStatus | string;
  /** Public page uses "Quotation Seen" instead of "Viewed" */
  variant?: "default" | "public";
};

export function QuotationStatusBadge({ status, variant = "default" }: Props) {
  const key = status as QuotationStatus;
  const style = STATUS_STYLES[key] ?? "bg-zinc-100 text-zinc-600";
  let label = STATUS_LABELS[key] ?? status;
  if (variant === "public" && key === "VIEWED") {
    label = "Quotation Seen";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}

export function getQuotationActivityLabel(status: QuotationStatus): string | undefined {
  const labels: Partial<Record<QuotationStatus, string>> = {
    SENT: "Sent",
    VIEWED: "Viewed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PURCHASE_ORDER_CREATED: "PO Created",
  };
  return labels[status];
}
