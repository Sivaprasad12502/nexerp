import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import { paymentReceiptIncludeRelations } from "@/lib/payment-receipt-includes";
import { sendPaymentReceiptEmail } from "@/lib/mailer";
import { paymentReceiptSendSchema } from "@/lib/validations/payment-receipt";
import {
  buildPaymentReceiptClientViewUrl,
  resolveRequestOrigin,
} from "@/lib/payment-receipt-utils";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.paymentReceipt.findFirst({
    where: { id, businessId: ctx.businessId },
    include: paymentReceiptIncludeRelations,
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = paymentReceiptSendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;
  const businessName = existing.business.brandName ?? existing.business.name;

  const approvalToken =
    existing.approvalToken ?? crypto.randomBytes(32).toString("hex");
  const origin = resolveRequestOrigin(req.headers);
  const viewUrl = buildPaymentReceiptClientViewUrl(origin, approvalToken);

  const emailSent = await sendPaymentReceiptEmail({
    to: data.to,
    cc: data.cc,
    replyTo: data.replyTo || undefined,
    subject: data.subject,
    message: data.message,
    businessName,
    viewUrl,
  });

  const now = new Date();
  const receipt = await prisma.paymentReceipt.update({
    where: { id },
    data: {
      emailSentAt: now,
      approvalToken,
    },
    include: paymentReceiptIncludeRelations,
  });

  return NextResponse.json({
    success: true,
    emailSent,
    sentAt: now,
    viewUrl,
    paymentReceipt: mapPaymentReceiptRow(receipt),
  });
}
