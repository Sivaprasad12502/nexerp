import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { documentSendSchema } from "@/lib/validations/document";
import { sendPurchaseOrderEmail, sendInvoiceEmail, sendSalesOrderEmail } from "@/lib/mailer";

type RouteCtx = { params: Promise<{ id: string }> };

// Document types that are allowed to use this send endpoint
const SENDABLE_TYPES: ("PURCHASE_ORDER" | "SALES_ORDER" | "INVOICE")[] = [
  "PURCHASE_ORDER",
  "SALES_ORDER",
  "INVOICE",
];

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId, type: { in: SENDABLE_TYPES } },
    include: {
      business: { select: { name: true, brandName: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const result = documentSendSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;
  const businessName = document.business.brandName ?? document.business.name;

  // Generate (or reuse) the approval token for the public view link
  const approvalToken =
    document.approvalToken ?? crypto.randomBytes(32).toString("hex");

  const origin =
    req.headers.get("origin") ??
    req.headers.get("x-forwarded-host")?.split(",")[0].trim()?.replace(/^/, "https://") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "";

  const isPurchaseOrder = document.type === "PURCHASE_ORDER";
  const isSalesOrder = document.type === "SALES_ORDER";
  const isInvoice = document.type === "INVOICE";
  const viewUrl = isPurchaseOrder
    ? `${origin}/purchase-order/${approvalToken}`
    : isSalesOrder
      ? `${origin}/sales-order/${approvalToken}`
      : isInvoice
        ? `${origin}/invoice/${approvalToken}`
        : "";
  const acceptUrl = isPurchaseOrder
    ? `${origin}/purchase-order/${approvalToken}?action=accept`
    : "";

  let emailSent = false;
  if (isInvoice) {
    emailSent = await sendInvoiceEmail({
      to: data.to,
      cc: data.cc,
      replyTo: data.replyTo || undefined,
      subject: data.subject,
      message: data.message,
      businessName,
      viewUrl,
    });
  } else if (isSalesOrder) {
    emailSent = await sendSalesOrderEmail({
      to: data.to,
      cc: data.cc,
      replyTo: data.replyTo || undefined,
      subject: data.subject,
      message: data.message,
      businessName,
      viewUrl,
    });
  } else {
    emailSent = await sendPurchaseOrderEmail({
      to: data.to,
      cc: data.cc,
      replyTo: data.replyTo || undefined,
      subject: data.subject,
      message: data.message,
      businessName,
      viewUrl,
      acceptUrl,
    });
  }

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
          ...(isInvoice || isSalesOrder
            ? { clientEmail: data.to }
            : { vendorEmail: data.to }),
          lastEmailSubject: data.subject,
        },
      },
    });
  });

  return NextResponse.json({ success: true, emailSent, sentAt: now });
}
