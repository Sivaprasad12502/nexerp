import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import { notifyBusinessOwner, notifyVendorLinked, NotificationType } from "@/lib/notifications";
import { getClientDisplayName, getQuotationLabel } from "@/lib/quotation-display";
import {
  buildQuotationDetailUrl,
  getSellerEmailContext,
  sendQuotationAcceptedEmail,
} from "@/lib/mailer";
import {
  ensureVendorRelationship,
  loadSellerSnapshot,
} from "@/lib/vendor-relationship";

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
          "Only the intended recipient can approve this quotation. Please sign in with the email address this quotation was sent to.",
      },
      { status: 403 },
    );
  }

  if (
    quotation.status === "APPROVED" ||
    quotation.status === "REJECTED" ||
    quotation.status === "PURCHASE_ORDER_CREATED"
  ) {
    return NextResponse.json(
      {
        error: `This quotation has already been ${quotation.status.toLowerCase().replace(/_/g, " ")}`,
        status: quotation.status,
      },
      { status: 409 },
    );
  }

  const buyerCtx = await getRbacContext();

  const canAutoProvision =
    buyerCtx !== null && buyerCtx.businessId !== quotation.businessId;

  let sellerSnapshot: Awaited<ReturnType<typeof loadSellerSnapshot>> = null;
  let buyerBusinessName = "A customer";

  if (canAutoProvision) {
    sellerSnapshot = await loadSellerSnapshot(prisma, quotation.businessId);

    const buyerBiz = await prisma.business.findUnique({
      where: { id: buyerCtx!.businessId },
      select: { name: true, brandName: true },
    });
    buyerBusinessName = buyerBiz?.brandName ?? buyerBiz?.name ?? "A customer";
  }

  const clientName = getClientDisplayName(quotation);
  const quotationLabel = getQuotationLabel(quotation);
  let relationshipId: string | null = null;

  await prisma.$transaction(async (tx) => {
    if (canAutoProvision && sellerSnapshot) {
      const result = await ensureVendorRelationship(tx, {
        buyerBusinessId: buyerCtx!.businessId,
        sellerBusinessId: quotation.businessId,
        sellerSnapshot,
        quotation,
      });
      relationshipId = result.relationshipId;
    }

    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: session.user.id,
        ...(relationshipId ? { businessRelationshipId: relationshipId } : {}),
      },
    });

    await tx.quotationActivity.create({
      data: {
        quotationId: quotation.id,
        action: "QUOTATION_APPROVED",
        userId: session.user.id,
        metadata: {
          approvedByEmail: sessionEmail,
          vendorCreated: canAutoProvision && sellerSnapshot !== null,
          relationshipId: relationshipId ?? undefined,
        },
      },
    });

    await notifyBusinessOwner(tx, quotation.businessId, {
      type: NotificationType.QUOTATION_APPROVED,
      title: "Client accepted your quotation",
      message: `${clientName} accepted quotation ${quotationLabel}.`,
      entityType: "QUOTATION",
      entityId: quotation.id,
    });

    if (canAutoProvision && sellerSnapshot) {
      await notifyVendorLinked(tx, {
        buyerUserId: buyerCtx!.userId,
        sellerBusinessId: quotation.businessId,
        quotationId: quotation.id,
        sellerName: sellerSnapshot.brandName ?? sellerSnapshot.name,
        buyerBusinessName,
      });
    }
  });

  void (async () => {
    try {
      const seller = await getSellerEmailContext(quotation.businessId);
      const sellerEmail = seller?.user.email;
      if (!sellerEmail) return;

      await sendQuotationAcceptedEmail({
        to: sellerEmail,
        clientName,
        quotationNumber: quotationLabel,
        businessName: seller.brandName ?? seller.name,
        ctaUrl: buildQuotationDetailUrl(quotation.id),
      });
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("[notifications] QUOTATION_APPROVED email failed (non-fatal)", err);
      }
    }
  })();

  return NextResponse.json({
    success: true,
    status: "APPROVED",
    businessRelationshipId: relationshipId,
  });
}
