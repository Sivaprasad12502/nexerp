import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * Public GET — vendor opens the PO via the email link.
 * No auth required. Stamps seenAt in settings on first view.
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
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

  if (!document || document.type !== "PURCHASE_ORDER") {
    return NextResponse.json(
      { error: "Purchase order not found or link is invalid." },
      { status: 404 },
    );
  }

  // Stamp seenAt on first view (non-blocking, best-effort)
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

  // Check whether a Sales Order has already been created from this PO
  const soConversion = await prisma.documentConversion.findUnique({
    where: {
      sourceType_sourceId_targetType: {
        sourceType: "PURCHASE_ORDER",
        sourceId: document.id,
        targetType: "SALES_ORDER",
      },
    },
    select: { targetId: true },
  });

  return NextResponse.json({
    document: {
      ...document,
      settings,
    },
    isAccepted: Boolean(soConversion),
    salesOrderId: soConversion?.targetId ?? null,
  });
}
