import { NextResponse } from "next/server";

import { getRbacContext, ctxCan } from "@/lib/rbac";
import { generateReceiptNumber } from "@/lib/payment-receipt-utils";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const receiptNumber = await generateReceiptNumber(ctx.businessId);
  return NextResponse.json({ receiptNumber });
}
