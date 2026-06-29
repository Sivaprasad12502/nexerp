import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { mapPaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import { paymentReceiptIncludeRelations } from "@/lib/payment-receipt-includes";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * Authenticated GET — client opens a payment receipt from an email/share link.
 * Requires login; session email must match the receipt client email.
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

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

  const clientEmail = receipt.client?.email?.toLowerCase().trim() ?? "";
  const sessionEmail = session.user.email?.toLowerCase().trim() ?? "";

  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can view this payment receipt. Please sign in with the email address this receipt was sent to.",
      },
      { status: 403 },
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
