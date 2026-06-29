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

async function loadDebitNoteContext(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const document = await prisma.document.findFirst({
    where: { approvalToken: token, type: "DEBIT_NOTE" },
    include: { client: { select: { email: true } } },
  });

  if (!document) {
    return {
      error: NextResponse.json(
        { error: "Debit note not found or link is invalid." },
        { status: 404 },
      ),
    };
  }

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  const clientEmail = (
    document.client?.email ??
    (typeof settings.clientEmail === "string" ? settings.clientEmail : "")
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim() ?? "";

  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only the intended recipient can perform this action. Please sign in with the email address this debit note was sent to.",
        },
        { status: 403 },
      ),
    };
  }

  return { session, document };
}

/** Client rejects debit note as expenditure (mirrors invoice expenditure reject). */
export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;
  const ctx = await loadDebitNoteContext(token);
  if ("error" in ctx && ctx.error) return ctx.error;

  const { session, document } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to perform this action." },
      { status: 403 },
    );
  }

  const conversion = await prisma.documentConversion.findFirst({
    where: {
      sourceType: "INVOICE",
      targetType: "DEBIT_NOTE",
      targetId: document.id,
      businessId: buyerCtx.businessId,
    },
    select: { id: true, sourceId: true },
  });

  await prisma.$transaction(async (tx) => {
    if (conversion) {
      await tx.document.delete({ where: { id: conversion.sourceId } });
      await tx.documentConversion.delete({ where: { id: conversion.id } });
    }

    const buyerBiz = await tx.business.findUnique({
      where: { id: buyerCtx.businessId },
      select: { brandName: true, name: true },
    });
    const buyerName = buyerBiz?.brandName ?? buyerBiz?.name ?? "Your client";

    await notifyBusinessOwner(tx, document.businessId, {
      type: NotificationType.QUOTATION_REJECTED,
      title: "Expenditure rejected",
      message: `${buyerName} rejected debit note ${document.documentNumber} as an expenditure.`,
      entityType: "DOCUMENT",
      entityId: document.id,
    });
  });

  void (async () => {
    try {
      const sellerCtx = await getSellerEmailContext(document.businessId);
      if (!sellerCtx?.user?.email) return;

      const sellerBusinessName =
        sellerCtx.brandName ?? sellerCtx.name ?? "Your business";
      const buyerName =
        document.fromName ?? session.user.email ?? "Your client";

      const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
      const ctaUrl = `${origin}/purchases/debit-note/${document.id}`;

      await sendSellerQuotationEventEmail({
        to: sellerCtx.user.email,
        subject: `Debit note ${document.documentNumber} removed from expenditures`,
        body: `${buyerName} removed debit note ${document.documentNumber} from their expenditures.`,
        businessName: sellerBusinessName,
        ctaUrl,
        ctaLabel: "View debit note",
      });
    } catch {
      // never let email failure break the response
    }
  })();

  return NextResponse.json({ success: true });
}
