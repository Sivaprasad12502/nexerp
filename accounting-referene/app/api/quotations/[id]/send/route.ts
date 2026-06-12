import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { sendQuotationEmail } from "@/lib/mailer";
import { quotationSendSchema } from "@/lib/validations/quotation";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.quotation.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { business: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Don't allow resending an already-decided quotation
  if (existing.status === "APPROVED" || existing.status === "REJECTED") {
    return NextResponse.json(
      { error: `Cannot send a quotation that is already ${existing.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  const result = quotationSendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  // Generate or reuse an approval token
  const approvalToken = existing.approvalToken ?? crypto.randomBytes(32).toString("hex");

  // Build the approval URL
  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const approvalUrl = `${origin}/quotation/approve/${approvalToken}`;

  // Persist token + status + sentAt
  await prisma.quotation.update({
    where: { id },
    data: {
      approvalToken,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  // Dispatch email
  const emailSent = await sendQuotationEmail({
    to: data.to,
    cc: data.cc,
    replyTo: data.replyTo || undefined,
    subject: data.subject,
    message: data.message,
    approvalUrl,
    businessName: existing.business.name,
  });

  // Log activity
  await prisma.quotationActivity.create({
    data: {
      quotationId: id,
      action: "QUOTATION_SENT",
      userId: ctx.userId,
      metadata: {
        to: data.to,
        cc: data.cc,
        subject: data.subject,
        emailDispatched: emailSent,
        approvalUrl,
      },
    },
  });

  return NextResponse.json({ approvalUrl, emailSent }, { status: 200 });
}
