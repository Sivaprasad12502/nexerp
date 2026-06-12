import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // Must be authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const quotation = await prisma.quotation.findFirst({
    where: { approvalToken: token },
    include: {
      client: { select: { email: true } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found or link is invalid" }, { status: 404 });
  }

  // Check approver email matches client email
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

  // Already decided
  if (quotation.status === "APPROVED" || quotation.status === "REJECTED") {
    return NextResponse.json(
      { error: `This quotation has already been ${quotation.status.toLowerCase()}`, status: quotation.status },
      { status: 409 },
    );
  }

  // ── Resolve the buyer's business (may be null — approver may have no business) ──
  // getRbacContext() calls ensureOwnerSetup internally (its own transaction), so it
  // MUST run outside the prisma.$transaction below to avoid nesting transactions.
  const buyerCtx = await getRbacContext();

  // Determine whether we can auto-provision a vendor + relationship:
  // - buyer must have a business
  // - buyer must not be the same business as the seller (prevent self-approval from creating junk)
  const canAutoProvision =
    buyerCtx !== null && buyerCtx.businessId !== quotation.businessId;

  let sellerSnapshot: {
    name: string;
    brandName: string | null;
    phone: string | null;
    website: string | null;
    gstNumber: string | null;
    country: string;
    user: { email: string };
  } | null = null;

  if (canAutoProvision) {
    sellerSnapshot = await prisma.business.findUnique({
      where: { id: quotation.businessId },
      select: {
        name:      true,
        brandName: true,
        phone:     true,
        website:   true,
        gstNumber: true,
        country:   true,
        user: { select: { email: true } },
      },
    });
  }

  // ── Atomic write ──────────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    let relationshipId: string | null = null;

    if (canAutoProvision && sellerSnapshot) {
      const buyerBusinessId  = buyerCtx!.businessId;
      const sellerBusinessId = quotation.businessId;

      // Upsert relationship (de-duplicated by unique constraint)
      const relationship = await tx.businessRelationship.upsert({
        where: {
          buyerBusinessId_sellerBusinessId: { buyerBusinessId, sellerBusinessId },
        },
        create: { buyerBusinessId, sellerBusinessId, status: "ACTIVE" },
        update: {},
      });
      relationshipId = relationship.id;

      // Upsert vendor in buyer's business
      const vendorName    = sellerSnapshot.brandName ?? sellerSnapshot.name;
      const vendorEmail   = sellerSnapshot.user.email;
      const vendorAddress = quotation.fromAddress ?? sellerSnapshot.country ?? null;

      await tx.vendor.upsert({
        where: {
          businessId_linkedBusinessId: { businessId: buyerBusinessId, linkedBusinessId: sellerBusinessId },
        },
        create: {
          businessId:       buyerBusinessId,
          linkedBusinessId: sellerBusinessId,
          name:      vendorName,
          email:     vendorEmail   || null,
          phone:     sellerSnapshot.phone     || null,
          website:   sellerSnapshot.website   || null,
          gstNumber: sellerSnapshot.gstNumber || null,
          address:   vendorAddress,
        },
        update: {},   // don't overwrite manual edits on subsequent approvals
      });
    }

    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status:                "APPROVED",
        approvedAt:            new Date(),
        approvedByUserId:      session.user.id,
        ...(relationshipId ? { businessRelationshipId: relationshipId } : {}),
      },
    });

    await tx.quotationActivity.create({
      data: {
        quotationId: quotation.id,
        action:      "QUOTATION_APPROVED",
        userId:      session.user.id,
        metadata: {
          approvedByEmail: sessionEmail,
          vendorCreated:   canAutoProvision && sellerSnapshot !== null,
          relationshipId:  relationshipId ?? undefined,
        },
      },
    });
  });

  return NextResponse.json({ success: true, status: "APPROVED" });
}
