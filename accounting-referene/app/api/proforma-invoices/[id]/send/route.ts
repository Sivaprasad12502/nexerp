import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { documentSendSchema } from "@/lib/validations/document";
import { sendProformaInvoiceEmail } from "@/lib/mailer";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId, type: "PROFORMA_INVOICE" },
    include: {
      business: { select: { name: true, brandName: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Proforma invoice not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const result = documentSendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;
  const businessName = document.business.brandName ?? document.business.name;

  const approvalToken =
    document.approvalToken ?? crypto.randomBytes(32).toString("hex");

  const origin =
    req.headers.get("origin") ??
    req.headers.get("x-forwarded-host")?.split(",")[0].trim()?.replace(/^/, "https://") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "";

  const viewUrl = `${origin}/proforma-invoice/${approvalToken}`;

  const emailSent = await sendProformaInvoiceEmail({
    to: data.to,
    cc: data.cc,
    replyTo: data.replyTo || undefined,
    subject: data.subject,
    message: data.message,
    businessName,
    viewUrl,
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id },
      data: {
        sentAt: now,
        status: "ISSUED",
        approvalToken,
        settings: {
          ...(typeof document.settings === "object" && document.settings !== null
            ? (document.settings as object)
            : {}),
          clientEmail: data.to,
          lastEmailSubject: data.subject,
        },
      },
    });
  });

  return NextResponse.json({ success: true, emailSent, sentAt: now });
}
