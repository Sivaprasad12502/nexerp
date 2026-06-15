import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";
import { getClientDisplayName, getQuotationLabel } from "@/lib/quotation-display";
import {
  buildQuotationDetailUrl,
  getSellerEmailContext,
  sendQuotationViewedEmail,
} from "@/lib/mailer";

type RouteCtx = { params: Promise<{ token: string }> };

const quotationInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
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
} as const;

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { approvalToken: token },
    include: quotationInclude,
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found or link is invalid" }, { status: 404 });
  }

  let viewedAt = quotation.viewedAt;
  let status = quotation.status;

  // Record the first view (SENT → VIEWED) atomically — prevents duplicate notifications
  if (quotation.status === "SENT") {
    const now = new Date();
    const clientName = getClientDisplayName(quotation);
    const quotationLabel = getQuotationLabel(quotation);

    const didView = await prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.updateMany({
        where: { id: quotation.id, status: "SENT" },
        data: { status: "VIEWED", viewedAt: now },
      });

      if (updated.count === 0) return false;

      await tx.quotationActivity.create({
        data: {
          quotationId: quotation.id,
          action: "QUOTATION_VIEWED",
          userId: null,
          metadata: {},
        },
      });

      await notifyBusinessOwner(tx, quotation.businessId, {
        type: NotificationType.QUOTATION_VIEWED,
        title: "Quotation Viewed",
        message: `${clientName} viewed quotation ${quotationLabel}`,
        entityType: "QUOTATION",
        entityId: quotation.id,
      });

      return true;
    });

    if (didView) {
      status = "VIEWED";
      viewedAt = now;

      // Email seller outside transaction (non-blocking)
      void (async () => {
        try {
          const seller = await getSellerEmailContext(quotation.businessId);
          const sellerEmail = seller?.user.email;
          if (!sellerEmail) return;

          await sendQuotationViewedEmail({
            to: sellerEmail,
            clientName,
            quotationNumber: quotationLabel,
            businessName: seller.brandName ?? seller.name,
            ctaUrl: buildQuotationDetailUrl(quotation.id),
          });
        } catch (err: unknown) {
          if (process.env.NODE_ENV === "development") {
            console.error("[notifications] QUOTATION_VIEWED email failed (non-fatal)", err);
          }
        }
      })();
    }
  }

  return NextResponse.json({
    quotation: {
      ...quotation,
      status,
      viewedAt,
    },
    clientEmail: quotation.client?.email ?? null,
    businessSettings: quotation.business?.businessSettings ?? null,
  });
}
