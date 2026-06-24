import type { PaymentReceiptType, PaymentReceiptStatus } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type { ReceiptFormatOptions } from "@/lib/payment-receipt-format";
export { formatReceiptAmount, parseInvoicePaymentStatus } from "@/lib/payment-receipt-format";

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
  if (type === "CLIENT_ADVANCE") return "ADVANCE";
  if (totalAllocated > 0 && totalAllocated >= totalReceived) return "SETTLED";
  if (totalAllocated > 0) return "SETTLED";
  return "ACTIVE";
}

/** List/preview status: receipts with settled invoice allocations show as SETTLED. */
export function resolveReceiptDisplayStatus(
  status: PaymentReceiptStatus | string,
  type: PaymentReceiptType | string,
  allocationCount: number,
): string {
  if (status === "DRAFT" || status === "ARCHIVED") return status;
  if (type === "CLIENT_ADVANCE") return "ADVANCE";
  if (allocationCount > 0) return "SETTLED";
  return status;
}
