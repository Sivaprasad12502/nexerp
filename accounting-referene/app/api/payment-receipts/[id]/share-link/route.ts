import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import {
  buildPaymentReceiptPublicUrl,
  resolveRequestOrigin,
} from "@/lib/payment-receipt-utils";

type RouteCtx = { params: Promise<{ id: string }> };

/** Ensure a shareable public link exists for a payment receipt. */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.paymentReceipt.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, approvalToken: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const approvalToken =
    existing.approvalToken ?? crypto.randomBytes(32).toString("hex");

  if (!existing.approvalToken) {
    await prisma.paymentReceipt.update({
      where: { id },
      data: { approvalToken },
    });
  }

  const origin = resolveRequestOrigin(req.headers);
  const viewUrl = buildPaymentReceiptPublicUrl(origin, approvalToken);

  return NextResponse.json({ viewUrl });
}
