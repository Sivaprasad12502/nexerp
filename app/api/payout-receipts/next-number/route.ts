import { NextResponse } from "next/server";

import { getRbacContext, ctxCan } from "@/lib/rbac";
import { generatePayoutReceiptNumber } from "@/lib/payout-receipt-utils";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const receiptNumber = await generatePayoutReceiptNumber(ctx.businessId);
  return NextResponse.json({ receiptNumber });
}
