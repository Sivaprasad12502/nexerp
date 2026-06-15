/**
 * Shared vendor + business-relationship provisioning for quotation approval
 * and buyer PO conversion. Keeps upsert logic in one place.
 */

import type { Prisma } from "@/app/generated/prisma/client";

type Db = Prisma.TransactionClient;

type SellerSnapshot = {
  name: string;
  brandName: string | null;
  phone: string | null;
  website: string | null;
  gstNumber: string | null;
  country: string;
  user: { email: string };
};

type QuotationSnapshot = {
  fromAddress: string | null;
};

export type EnsureVendorRelationshipResult = {
  relationshipId: string;
  vendorCreated: boolean;
};

/**
 * Upsert BusinessRelationship and linked Vendor in the buyer's business.
 * Idempotent — safe to call when relationship already exists.
 */
export async function ensureVendorRelationship(
  tx: Db,
  {
    buyerBusinessId,
    sellerBusinessId,
    sellerSnapshot,
    quotation,
  }: {
    buyerBusinessId: string;
    sellerBusinessId: string;
    sellerSnapshot: SellerSnapshot;
    quotation: QuotationSnapshot;
  },
): Promise<EnsureVendorRelationshipResult> {
  const relationship = await tx.businessRelationship.upsert({
    where: {
      buyerBusinessId_sellerBusinessId: { buyerBusinessId, sellerBusinessId },
    },
    create: { buyerBusinessId, sellerBusinessId, status: "ACTIVE" },
    update: {},
  });

  const vendorName = sellerSnapshot.brandName ?? sellerSnapshot.name;
  const vendorEmail = sellerSnapshot.user.email;
  const vendorAddress = quotation.fromAddress ?? sellerSnapshot.country ?? null;

  const existingVendor = await tx.vendor.findUnique({
    where: {
      businessId_linkedBusinessId: {
        businessId: buyerBusinessId,
        linkedBusinessId: sellerBusinessId,
      },
    },
    select: { id: true },
  });

  await tx.vendor.upsert({
    where: {
      businessId_linkedBusinessId: {
        businessId: buyerBusinessId,
        linkedBusinessId: sellerBusinessId,
      },
    },
    create: {
      businessId: buyerBusinessId,
      linkedBusinessId: sellerBusinessId,
      name: vendorName,
      email: vendorEmail || null,
      phone: sellerSnapshot.phone || null,
      website: sellerSnapshot.website || null,
      gstNumber: sellerSnapshot.gstNumber || null,
      address: vendorAddress,
    },
    update: {},
  });

  return {
    relationshipId: relationship.id,
    vendorCreated: !existingVendor,
  };
}

/**
 * Load seller business snapshot needed for vendor provisioning.
 */
export async function loadSellerSnapshot(tx: Db, sellerBusinessId: string) {
  return tx.business.findUnique({
    where: { id: sellerBusinessId },
    select: {
      name: true,
      brandName: true,
      phone: true,
      website: true,
      gstNumber: true,
      country: true,
      user: { select: { email: true } },
    },
  });
}
