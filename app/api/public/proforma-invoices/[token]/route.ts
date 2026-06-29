import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ token: string }> };

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

  if (!document || document.type !== "PROFORMA_INVOICE") {
    return NextResponse.json(
      { error: "Proforma invoice not found or link is invalid." },
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

  const payments = await prisma.payment.findMany({
    where: { documentId: document.id },
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      amountReceived: true,
      paymentDate: true,
      method: true,
      status: true,
    },
  });

  // For expense docs (purchasedAt set), expose acceptance state so the public
  // page can render Accept / Reject buttons.
  let isAccepted = false;
  let invoiceDocumentId: string | null = null;
  const acceptanceStatus = (settings.acceptanceStatus as string) ?? null;

  // For normal invoices (purchasedAt not set), expose whether a buyer has
  // already added it as an expenditure so the public page can swap the button.
  let expenditureAdded = false;
  let expenditureDocumentId: string | null = null;

  if (document.purchasedAt) {
    const conversion = await prisma.documentConversion.findUnique({
      where: {
        sourceType_sourceId_targetType: {
          sourceType: "INVOICE",
          sourceId: document.id,
          targetType: "INVOICE",
        },
      },
      select: { targetId: true },
    });
    invoiceDocumentId = conversion?.targetId ?? null;
    isAccepted = Boolean(conversion) || acceptanceStatus === "ACCEPTED";
  } else {
    // Normal invoice — find if any buyer has linked it as an expenditure.
    // We return the first match; the buyer-specific check happens in the
    // add/reject routes after auth, so this is just a hint for the UI.
    const buyerConversion = await prisma.documentConversion.findFirst({
      where: {
        sourceType: "INVOICE",
        targetType: "PROFORMA_INVOICE",
        targetId: document.id,
      },
      select: { sourceId: true },
    });
    expenditureDocumentId = buyerConversion?.sourceId ?? null;
    expenditureAdded = Boolean(buyerConversion);
  }

  return NextResponse.json({
    document: { ...document, settings },
    payments,
    isAccepted,
    acceptanceStatus,
    invoiceDocumentId,
    expenditureAdded,
    expenditureDocumentId,
    recipientEmail: (settings.clientEmail as string) ?? null,
  });
}
