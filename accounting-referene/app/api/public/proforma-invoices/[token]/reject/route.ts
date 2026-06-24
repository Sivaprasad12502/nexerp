import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";

type RouteCtx = { params: Promise<{ token: string }> };

const rejectBodySchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // ── Load document ──────────────────────────────────────────────────────────
  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
  });

  if (!document || document.type !== "PROFORMA_INVOICE") {
    return NextResponse.json(
      { error: "Proforma proforma invoice not found or link is invalid." },
      { status: 404 },
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = rejectBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { rejectionReason } = result.data;

  // ── Stamp rejection + notify ───────────────────────────────────────────────
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
          acceptanceStatus: "REJECTED",
          respondedAt: new Date().toISOString(),
          rejectionReason,
        },
      },
    });

    await notifyBusinessOwner(tx, document.businessId, {
      type: NotificationType.QUOTATION_REJECTED,
      title: "Invoice rejected by vendor",
      message: `Invoice ${document.documentNumber} was rejected. Reason: ${rejectionReason}`,
      entityType: "DOCUMENT",
      entityId: document.id,
    });

    return doc;
  });

  return NextResponse.json({ document: updated });
}
