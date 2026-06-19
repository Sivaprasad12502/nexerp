import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";
import {
  sendSellerQuotationEventEmail,
  getSellerEmailContext,
} from "@/lib/mailer";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // ── Auth required ──────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── Load invoice by approval token ────────────────────────────────────────
  const invoice = await prisma.document.findUnique({
    where: { approvalToken: token },
    select: {
      id: true,
      type: true,
      purchasedAt: true,
      businessId: true,
      documentNumber: true,
      fromName: true,
      settings: true,
    },
  });

  if (!invoice || invoice.type !== "INVOICE" || invoice.purchasedAt) {
    return NextResponse.json(
      { error: "Invoice not found or link is invalid." },
      { status: 404 },
    );
  }

  // ── Recipient check ────────────────────────────────────────────────────────
  const settings =
    typeof invoice.settings === "object" && invoice.settings !== null
      ? (invoice.settings as Record<string, unknown>)
      : {};

  const recipientEmail = (
    (typeof settings.clientEmail === "string" ? settings.clientEmail : null) ?? ""
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim();
  if (!recipientEmail || !sessionEmail || recipientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can reject this invoice expenditure.",
      },
      { status: 403 },
    );
  }

  // ── Buyer business required ────────────────────────────────────────────────
  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to perform this action." },
      { status: 403 },
    );
  }

  // ── Find the buyer's linked expenditure conversion ────────────────────────
  const conversion = await prisma.documentConversion.findFirst({
    where: {
      sourceType: "INVOICE",
      targetType: "INVOICE",
      targetId: invoice.id,
      businessId: buyerCtx.businessId,
    },
    select: { id: true, sourceId: true },
  });

  if (!conversion) {
    return NextResponse.json(
      { error: "No expenditure linked to this invoice for your business." },
      { status: 404 },
    );
  }

  const expenditureId = conversion.sourceId;

  // ── Delete expenditure + conversion in a transaction ─────────────────────
  await prisma.$transaction(async (tx) => {
    // Delete the expenditure document (items cascade via onDelete Cascade)
    await tx.document.delete({ where: { id: expenditureId } });

    // Delete the conversion audit row
    await tx.documentConversion.delete({ where: { id: conversion.id } });

    // In-app notification to the seller (invoice owner)
    const buyerBusinessName = (await tx.business.findUnique({
      where: { id: buyerCtx.businessId },
      select: { brandName: true, name: true },
    }));
    const buyerName = buyerBusinessName?.brandName ?? buyerBusinessName?.name ?? "Your client";

    await notifyBusinessOwner(tx, invoice.businessId, {
      type: NotificationType.QUOTATION_REJECTED,
      title: "Invoice removed from expenditures",
      message: `${buyerName} removed invoice ${invoice.documentNumber} from their expenditures.`,
      entityType: "DOCUMENT",
      entityId: invoice.id,
    });
  });

  // ── Fire-and-forget email to the seller ───────────────────────────────────
  void (async () => {
    try {
      const sellerCtx = await getSellerEmailContext(invoice.businessId);
      if (!sellerCtx?.user?.email) return;

      const sellerBusinessName =
        sellerCtx.brandName ?? sellerCtx.name ?? "Your business";
      const buyerName =
        invoice.fromName ?? session.user.email ?? "Your client";

      const origin =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
      const ctaUrl = `${origin}/sales-and-invoices/documents/${invoice.id}`;

      await sendSellerQuotationEventEmail({
        to: sellerCtx.user.email,
        subject: `Invoice ${invoice.documentNumber} removed from expenditures`,
        body: `${buyerName} removed invoice ${invoice.documentNumber} from their expenditures.`,
        businessName: sellerBusinessName,
        ctaUrl,
        ctaLabel: "View invoice",
      });
    } catch {
      // never let email failure break the response
    }
  })();

  return NextResponse.json({ success: true });
}
