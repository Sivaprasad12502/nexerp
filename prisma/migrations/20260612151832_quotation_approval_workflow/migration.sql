-- Phase 1: Quotation Approval Workflow
-- This migration only adds NEW things on top of the existing schema that was
-- applied via prisma db push. It does NOT recreate existing tables.

-- 1. Extend QuotationStatus enum with new values
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'VIEWED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- 2. Add new QuotationActivityAction enum
DO $$ BEGIN
  CREATE TYPE "QuotationActivityAction" AS ENUM (
    'QUOTATION_SENT',
    'QUOTATION_VIEWED',
    'QUOTATION_APPROVED',
    'QUOTATION_REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add approval columns to Quotation table
ALTER TABLE "Quotation"
  ADD COLUMN IF NOT EXISTS "approvalToken"    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "sentAt"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "viewedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;

-- 4. Add foreign key from Quotation.approvedByUserId -> User.id
ALTER TABLE "Quotation"
  ADD CONSTRAINT "Quotation_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "Quotation" VALIDATE CONSTRAINT "Quotation_approvedByUserId_fkey";

-- 5. Create QuotationActivity table
CREATE TABLE IF NOT EXISTS "QuotationActivity" (
  "id"          TEXT        NOT NULL,
  "quotationId" TEXT        NOT NULL,
  "action"      "QuotationActivityAction" NOT NULL,
  "userId"      TEXT,
  "metadata"    JSONB       NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuotationActivity_pkey" PRIMARY KEY ("id")
);

-- 6. Foreign keys for QuotationActivity
ALTER TABLE "QuotationActivity"
  ADD CONSTRAINT "QuotationActivity_quotationId_fkey"
  FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotationActivity"
  ADD CONSTRAINT "QuotationActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Index on QuotationActivity
CREATE INDEX IF NOT EXISTS "QuotationActivity_quotationId_idx"
  ON "QuotationActivity"("quotationId");
