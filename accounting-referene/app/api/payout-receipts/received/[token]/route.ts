import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { mapPayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import { payoutReceiptIncludeRelations } from "@/lib/payout-receipt-includes";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * Authenticated GET — vendor opens a payout receipt from an email/share link.
 * Requires login; session email must match the receipt vendor email.
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { token } = await params;

  const receipt = await prisma.payoutReceipt.findUnique({
    where: { approvalToken: token },
    include: payoutReceiptIncludeRelations,
  });

  if (!receipt) {
    return NextResponse.json(
      { error: "Payout receipt not found or link is invalid." },
      { status: 404 },
    );
  }

  const vendorEmail = receipt.vendor?.email?.toLowerCase().trim() ?? "";
  const sessionEmail = session.user.email?.toLowerCase().trim() ?? "";

  if (!vendorEmail || !sessionEmail || vendorEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can view this payout receipt. Please sign in with the email address this receipt was sent to.",
      },
      { status: 403 },
    );
  }

  const settings =
    typeof receipt.settings === "object" && receipt.settings !== null
      ? (receipt.settings as Record<string, unknown>)
      : {};

  if (!settings.seenAt) {
    await prisma.payoutReceipt.update({
      where: { id: receipt.id },
      data: {
        settings: { ...settings, seenAt: new Date().toISOString() },
      },
    });
    settings.seenAt = new Date().toISOString();
  }

  const businessSettings = receipt.business?.businessSettings ?? null;

  return NextResponse.json({
    payoutReceipt: mapPayoutReceiptRow(receipt),
    businessSettings,
    vendorEmail: receipt.vendor?.email ?? null,
  });
}
