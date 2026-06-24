import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapPaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import { paymentReceiptIncludeRelations } from "@/lib/payment-receipt-includes";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * Public GET — client opens the payment receipt via the email link.
 * No auth required. Stamps seenAt in settings on first view.
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { approvalToken: token },
    include: paymentReceiptIncludeRelations,
  });

  if (!receipt) {
    return NextResponse.json(
      { error: "Payment receipt not found or link is invalid." },
      { status: 404 },
    );
  }

  const settings =
    typeof receipt.settings === "object" && receipt.settings !== null
      ? (receipt.settings as Record<string, unknown>)
      : {};

  if (!settings.seenAt) {
    await prisma.paymentReceipt.update({
      where: { id: receipt.id },
      data: {
        settings: { ...settings, seenAt: new Date().toISOString() },
      },
    });
    settings.seenAt = new Date().toISOString();
  }

  const businessSettings = receipt.business?.businessSettings ?? null;

  return NextResponse.json({
    paymentReceipt: mapPaymentReceiptRow(receipt),
    businessSettings,
    clientEmail: receipt.client?.email ?? null,
  });
}
