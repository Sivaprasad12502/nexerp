import crypto from "crypto";
import type { PayoutReceiptType, PayoutReceiptStatus } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type { ReceiptFormatOptions } from "@/lib/payment-receipt-format";
export { formatReceiptAmount, parseInvoicePaymentStatus } from "@/lib/payment-receipt-format";

/** Build the in-app vendor view URL for a payout receipt (requires login). */
export function buildPayoutReceiptVendorViewUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/purchases/payout-reciept/received/${token}`;
}

/** Mint a new 64-char hex approval token (same as document send flow). */
export function mintPayoutReceiptApprovalToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Resolve request origin for public share links. */
export function resolveRequestOrigin(headers: Headers): string {
  return (
    headers.get("origin") ??
    headers.get("x-forwarded-host")?.split(",")[0].trim()?.replace(/^/, "https://") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    ""
  );
}

/** Generate next receipt number like A00001 for the business. Server-only. */
export async function generatePayoutReceiptNumber(businessId: string): Promise<string> {
  const count = await prisma.payoutReceipt.count({ where: { businessId } });
  const next = count + 1;
  return `A${String(next).padStart(5, "0")}`;
}

export function computePayoutReceiptStatus(
  type: PayoutReceiptType,
  totalReceived: number,
  totalAllocated: number,
): PayoutReceiptStatus {
  if (totalAllocated > 0) return "SETTLED";
  if (type === "VENDOR_ADVANCE") return "ADVANCE";
  return "ADVANCE";
}

/** List/preview status: receipts with settled expenditure allocations show as SETTLED. */
export function resolvePayoutReceiptDisplayStatus(
  status: PayoutReceiptStatus | string,
  type: PayoutReceiptType | string,
  allocationCount: number,
): string {
  if (status === "DRAFT" || status === "ARCHIVED") return status;
  if (allocationCount > 0) return "SETTLED";
  if (type === "VENDOR_ADVANCE" || status === "ADVANCE") return "ADVANCE";
  return status;
}
