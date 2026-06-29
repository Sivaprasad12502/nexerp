import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import { payoutReceiptIncludeRelations } from "@/lib/payout-receipt-includes";
import { sendPayoutReceiptEmail } from "@/lib/mailer";
import { payoutReceiptSendSchema } from "@/lib/validations/payout-receipt";
import {
  buildPayoutReceiptVendorViewUrl,
  resolveRequestOrigin,
} from "@/lib/payout-receipt-utils";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.payoutReceipt.findFirst({
    where: { id, businessId: ctx.businessId },
    include: payoutReceiptIncludeRelations,
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = payoutReceiptSendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;
  const businessName = existing.business.brandName ?? existing.business.name;

  const approvalToken = existing.approvalToken ?? crypto.randomBytes(32).toString("hex");
  const origin = resolveRequestOrigin(req.headers);
  const viewUrl = buildPayoutReceiptVendorViewUrl(origin, approvalToken);

  const emailSent = await sendPayoutReceiptEmail({
    to: data.to,
    cc: data.cc,
    replyTo: data.replyTo || undefined,
    subject: data.subject,
    message: data.message,
    businessName,
    viewUrl,
  });

  const now = new Date();
  const receipt = await prisma.payoutReceipt.update({
    where: { id },
    data: {
      emailSentAt: now,
      approvalToken,
    },
    include: payoutReceiptIncludeRelations,
  });

  return NextResponse.json({
    success: true,
    emailSent,
    sentAt: now,
    viewUrl,
    payoutReceipt: mapPayoutReceiptRow(receipt),
  });
}
