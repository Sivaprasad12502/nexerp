-- Purchase order workflow fields on Document

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "purchasedAt" TIMESTAMP(3);
