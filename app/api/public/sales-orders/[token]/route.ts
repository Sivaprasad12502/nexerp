import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * Public GET — client opens the sales order via the email link.
 * No auth required. Stamps seenAt in settings on first view.
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { email: true, businessName: true } },
      business: {
        select: {
          name: true,
          brandName: true,
          country: true,
          gstNumber: true,
        },
      },
    },
  });

  if (!document || document.type !== "SALES_ORDER") {
    return NextResponse.json(
      { error: "Sales order not found or link is invalid." },
      { status: 404 },
    );
  }

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  if (!settings.seenAt) {
    await prisma.document.update({
      where: { id: document.id },
      data: {
        settings: { ...settings, seenAt: new Date().toISOString() },
      },
    });
    settings.seenAt = new Date().toISOString();
  }

  const poConversion = await prisma.documentConversion.findFirst({
    where: {
      sourceType: "SALES_ORDER",
      sourceId: document.id,
      targetType: "PURCHASE_ORDER",
    },
    select: { targetId: true },
  });

  const clientEmail =
    (typeof settings.clientEmail === "string" ? settings.clientEmail : null) ??
    document.client?.email ??
    null;

  return NextResponse.json({
    document: {
      ...document,
      settings,
    },
    isAccepted: Boolean(poConversion) || settings.acceptanceStatus === "ACCEPTED",
    purchaseOrderId: poConversion?.targetId ?? null,
    clientEmail,
  });
}
