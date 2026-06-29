import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";

type RouteCtx = { params: Promise<{ token: string }> };

const respondSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

/** Authenticated POST — client accepts or rejects a debit note. */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { token } = await params;

  const document = await prisma.document.findFirst({
    where: { approvalToken: token, type: "DEBIT_NOTE" },
    include: {
      client: { select: { email: true } },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Debit note not found or link is invalid." },
      { status: 404 },
    );
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
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can respond to this debit note. Please sign in with the email address this debit note was sent to.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = respondSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { action } = result.data;
  const acceptanceStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id: document.id },
      data: {
        settings: {
          ...settings,
          acceptanceStatus,
          respondedAt: new Date().toISOString(),
        },
      },
    });

    const notifType =
      action === "accept"
        ? NotificationType.QUOTATION_APPROVED
        : NotificationType.QUOTATION_REJECTED;

    await notifyBusinessOwner(tx, document.businessId, {
      type: notifType,
      title:
        action === "accept" ? "Debit note accepted" : "Debit note rejected",
      message:
        action === "accept"
          ? `Debit note ${document.documentNumber} was accepted by the client.`
          : `Debit note ${document.documentNumber} was rejected by the client.`,
      entityType: "DOCUMENT",
      entityId: document.id,
    });

    return doc;
  });

  const updatedSettings =
    typeof updated.settings === "object" && updated.settings !== null
      ? (updated.settings as Record<string, unknown>)
      : {};

  return NextResponse.json({
    acceptanceStatus: updatedSettings.acceptanceStatus ?? acceptanceStatus,
    isDebitNoteAccepted: acceptanceStatus === "ACCEPTED",
  });
}
