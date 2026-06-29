import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import {
  convertQuotationToBuyerPurchaseOrder,
  ConversionError,
} from "@/lib/document-conversion";
import { getClientDisplayName, getQuotationLabel } from "@/lib/quotation-display";
import {
  buildQuotationDetailUrl,
  getSellerEmailContext,
  sendPurchaseOrderReceivedEmail,
} from "@/lib/mailer";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const quotation = await prisma.quotation.findFirst({
    where: { approvalToken: token },
    include: {
      client: { select: { email: true, businessName: true } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found or link is invalid" }, { status: 404 });
  }

  const clientEmail = quotation.client?.email?.toLowerCase().trim();
  const sessionEmail = session.user.email?.toLowerCase().trim();
  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can convert this quotation. Please sign in with the email address this quotation was sent to.",
      },
      { status: 403 },
    );
  }

  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to create a purchase order." },
      { status: 403 },
    );
  }

  try {
    const result = await convertQuotationToBuyerPurchaseOrder({
      quotationId: quotation.id,
      buyerBusinessId: buyerCtx.businessId,
      buyerUserId: buyerCtx.userId,
    });

    if (result.created) {
      const clientName = getClientDisplayName(quotation);
      const quotationLabel = getQuotationLabel(quotation);

      void (async () => {
        try {
          const seller = await getSellerEmailContext(quotation.businessId);
          const sellerEmail = seller?.user.email;
          if (!sellerEmail) return;

          await sendPurchaseOrderReceivedEmail({
            to: sellerEmail,
            clientName,
            quotationNumber: quotationLabel,
            businessName: seller.brandName ?? seller.name,
            ctaUrl: buildQuotationDetailUrl(quotation.id),
          });
        } catch (err: unknown) {
          if (process.env.NODE_ENV === "development") {
            console.error("[notifications] PURCHASE_ORDER_RECEIVED email failed (non-fatal)", err);
          }
        }
      })();
    }

    const updatedQuotation = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      select: {
        id: true,
        status: true,
        purchaseOrderCreatedAt: true,
      },
    });

    return NextResponse.json(
      {
        document: result.document,
        quotation: updatedQuotation,
        created: result.created,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err: unknown) {
    if (err instanceof ConversionError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        NOT_APPROVED: 409,
        DUPLICATE: 409,
        NO_BUSINESS: 403,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    console.error("[public:convert-po:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
