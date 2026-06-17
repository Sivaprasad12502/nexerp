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

  if (!document || document.type !== "INVOICE") {
    return NextResponse.json(
      { error: "Invoice not found or link is invalid." },
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

  return NextResponse.json({
    document: { ...document, settings },
    payments,
  });
}
