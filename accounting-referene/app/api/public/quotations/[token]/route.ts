import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { approvalToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: {
        select: {
          id: true,
          businessName: true,
          logo: true,
          email: true,
          phone: true,
          streetAddress: true,
          addressCity: true,
          state: true,
          addressCountry: true,
          trn: true,
          vatNumber: true,
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          brandName: true,
          country: true,
          currency: true,
          businessSettings: true,
        },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found or link is invalid" }, { status: 404 });
  }

  // Record the first view (SENT → VIEWED)
  if (quotation.status === "SENT") {
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });

    await prisma.quotationActivity.create({
      data: {
        quotationId: quotation.id,
        action: "QUOTATION_VIEWED",
        userId: null,
        metadata: {},
      },
    });
  }

  // Return sanitized response — include client email for auth-match hint on front-end
  return NextResponse.json({
    quotation: {
      ...quotation,
      // Update status to VIEWED in the response if we just flipped it
      status: quotation.status === "SENT" ? "VIEWED" : quotation.status,
      viewedAt: quotation.status === "SENT" ? new Date().toISOString() : quotation.viewedAt,
    },
    clientEmail: quotation.client?.email ?? null,
    businessSettings: quotation.business?.businessSettings ?? null,
  });
}
