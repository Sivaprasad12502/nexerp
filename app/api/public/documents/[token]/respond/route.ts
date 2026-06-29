import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";

type RouteCtx = { params: Promise<{ token: string }> };

const respondSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
  });

  if (!document || document.type !== "INVOICE") {
    return NextResponse.json(
      { error: "Invoice not found or link is invalid." },
      { status: 404 },
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

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

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
        action === "accept"
          ? "Invoice accepted"
          : "Invoice rejected",
      message:
        action === "accept"
          ? `Invoice ${document.documentNumber} was accepted by the client.`
          : `Invoice ${document.documentNumber} was rejected by the client.`,
      entityType: "DOCUMENT",
      entityId: document.id,
    });

    return doc;
  });

  return NextResponse.json({ document: updated });
}
