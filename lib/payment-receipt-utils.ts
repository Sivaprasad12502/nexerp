import crypto from "crypto";
import type { PaymentReceiptType, PaymentReceiptStatus } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type { ReceiptFormatOptions } from "@/lib/payment-receipt-format";
export { formatReceiptAmount, parseInvoicePaymentStatus } from "@/lib/payment-receipt-format";

/** Build the in-app client view URL for a payment receipt (requires login). */
export function buildPaymentReceiptClientViewUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/sales-and-invoices/payement-receipts/received/${token}`;
}

/** Mint a new 64-char hex approval token (same as document send flow). */
export function mintPaymentReceiptApprovalToken(): string {
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
export async function generateReceiptNumber(businessId: string): Promise<string> {
  const count = await prisma.paymentReceipt.count({ where: { businessId } });
  const next = count + 1;
  return `A${String(next).padStart(5, "0")}`;
}

export function computeReceiptStatus(
  type: PaymentReceiptType,
  totalReceived: number,
  totalAllocated: number,
): PaymentReceiptStatus {
  if (totalAllocated > 0) return "SETTLED";
  if (type === "CLIENT_ADVANCE") return "ADVANCE";
  // Unallocated payment receipts are advances until applied to invoices.
  return "ADVANCE";
}

/** List/preview status: receipts with settled invoice allocations show as SETTLED. */
export function resolveReceiptDisplayStatus(
  status: PaymentReceiptStatus | string,
  type: PaymentReceiptType | string,
  allocationCount: number,
): string {
  if (status === "DRAFT" || status === "ARCHIVED") return status;
  if (allocationCount > 0) return "SETTLED";
  if (type === "CLIENT_ADVANCE" || status === "ADVANCE") return "ADVANCE";
  return status;
}
