-- Phase 2: Vendor Auto-Creation & Business Relationships
-- Applied via: npx prisma db execute --file <this_file>
-- Then:        npx prisma migrate resolve --applied 20260612180000_vendor_relationships
-- Then:        npx prisma generate

-- ─── 1. New enums ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "BusinessRelationshipStatus" AS ENUM ('ACTIVE', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 2. Vendor table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Vendor" (
  "id"               TEXT NOT NULL,
  "businessId"       TEXT NOT NULL,
  "linkedBusinessId" TEXT,
  "name"             TEXT NOT NULL,
  "email"            TEXT,
  "phone"            TEXT,
  "website"          TEXT,
  "address"          TEXT,
  "gstNumber"        TEXT,
  "status"           "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- FK: Vendor.businessId → Business.id
DO $$
BEGIN
  ALTER TABLE "Vendor"
    ADD CONSTRAINT "Vendor_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Vendor" VALIDATE CONSTRAINT "Vendor_businessId_fkey";

-- FK: Vendor.linkedBusinessId → Business.id (optional)
DO $$
BEGIN
  ALTER TABLE "Vendor"
    ADD CONSTRAINT "Vendor_linkedBusinessId_fkey"
    FOREIGN KEY ("linkedBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Vendor" VALIDATE CONSTRAINT "Vendor_linkedBusinessId_fkey";

-- Unique + index
CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_businessId_linkedBusinessId_key"
  ON "Vendor"("businessId", "linkedBusinessId");

CREATE INDEX IF NOT EXISTS "Vendor_businessId_status_idx"
  ON "Vendor"("businessId", "status");

-- ─── 3. BusinessRelationship table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "BusinessRelationship" (
  "id"               TEXT NOT NULL,
  "buyerBusinessId"  TEXT NOT NULL,
  "sellerBusinessId" TEXT NOT NULL,
  "status"           "BusinessRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRelationship_pkey" PRIMARY KEY ("id")
);

-- FK: buyerBusinessId → Business.id
DO $$
BEGIN
  ALTER TABLE "BusinessRelationship"
    ADD CONSTRAINT "BusinessRelationship_buyerBusinessId_fkey"
    FOREIGN KEY ("buyerBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "BusinessRelationship" VALIDATE CONSTRAINT "BusinessRelationship_buyerBusinessId_fkey";

-- FK: sellerBusinessId → Business.id
DO $$
BEGIN
  ALTER TABLE "BusinessRelationship"
    ADD CONSTRAINT "BusinessRelationship_sellerBusinessId_fkey"
    FOREIGN KEY ("sellerBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "BusinessRelationship" VALIDATE CONSTRAINT "BusinessRelationship_sellerBusinessId_fkey";

-- Unique + index
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessRelationship_buyerBusinessId_sellerBusinessId_key"
  ON "BusinessRelationship"("buyerBusinessId", "sellerBusinessId");

CREATE INDEX IF NOT EXISTS "BusinessRelationship_sellerBusinessId_idx"
  ON "BusinessRelationship"("sellerBusinessId");

-- ─── 4. Add businessRelationshipId to Quotation ───────────────────────────────

ALTER TABLE "Quotation"
  ADD COLUMN IF NOT EXISTS "businessRelationshipId" TEXT;

-- FK: Quotation.businessRelationshipId → BusinessRelationship.id
DO $$
BEGIN
  ALTER TABLE "Quotation"
    ADD CONSTRAINT "Quotation_businessRelationshipId_fkey"
    FOREIGN KEY ("businessRelationshipId") REFERENCES "BusinessRelationship"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Quotation" VALIDATE CONSTRAINT "Quotation_businessRelationshipId_fkey";
