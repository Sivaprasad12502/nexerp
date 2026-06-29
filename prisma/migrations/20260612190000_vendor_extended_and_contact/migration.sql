-- Gap-fill: extended Vendor fields and VendorContact table added via "prisma db push".
-- Also reconciles schema drift left by 20260612180000_vendor_relationships (which was
-- resolve --applied and whose SQL never ran on the real DB).
-- All statements are idempotent so they are safe no-ops on an existing database.

-- ─── 0. Reconcile drift from 20260612180000 ──────────────────────────────────
-- The vendor_relationships migration creates Vendor/BusinessRelationship with
-- DEFAULT CURRENT_TIMESTAMP for updatedAt and a FK on Vendor.linkedBusinessId.
-- The real DB (created via db push) has neither; strip them here.

ALTER TABLE "Vendor" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "BusinessRelationship" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Vendor" DROP CONSTRAINT IF EXISTS "Vendor_linkedBusinessId_fkey";

-- ─── 1. VendorType enum ───────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE "VendorType" AS ENUM ('INDIVIDUAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 2. Extended columns on Vendor ───────────────────────────────────────────

ALTER TABLE "Vendor"
  ADD COLUMN IF NOT EXISTS "vendorType"     "VendorType" NOT NULL DEFAULT 'COMPANY',
  ADD COLUMN IF NOT EXISTS "logo"           TEXT,
  ADD COLUMN IF NOT EXISTS "industry"       TEXT,
  ADD COLUMN IF NOT EXISTS "country"        TEXT,
  ADD COLUMN IF NOT EXISTS "city"           TEXT,
  ADD COLUMN IF NOT EXISTS "trn"            TEXT,
  ADD COLUMN IF NOT EXISTS "vatNumber"      TEXT,
  ADD COLUMN IF NOT EXISTS "taxTreatment"   TEXT,
  ADD COLUMN IF NOT EXISTS "addressCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "state"          TEXT,
  ADD COLUMN IF NOT EXISTS "district"       TEXT,
  ADD COLUMN IF NOT EXISTS "addressCity"    TEXT,
  ADD COLUMN IF NOT EXISTS "buildingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode"     TEXT,
  ADD COLUMN IF NOT EXISTS "streetAddress"  TEXT,
  ADD COLUMN IF NOT EXISTS "businessAlias"  TEXT,
  ADD COLUMN IF NOT EXISTS "phoneCode"      TEXT DEFAULT '+971',
  ADD COLUMN IF NOT EXISTS "showEmailInDocs"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showPhoneInDocs"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "defaultDueDays"   INTEGER,
  ADD COLUMN IF NOT EXISTS "paymentAccount"   TEXT;

-- ─── 3. VendorContact table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "VendorContact" (
  "id"        TEXT NOT NULL,
  "vendorId"  TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorContact_vendorId_contactId_key"
  ON "VendorContact"("vendorId", "contactId");

DO $$
BEGIN
  ALTER TABLE "VendorContact"
    ADD CONSTRAINT "VendorContact_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "VendorContact" VALIDATE CONSTRAINT "VendorContact_vendorId_fkey";

DO $$
BEGIN
  ALTER TABLE "VendorContact"
    ADD CONSTRAINT "VendorContact_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "VendorContact" VALIDATE CONSTRAINT "VendorContact_contactId_fkey";
