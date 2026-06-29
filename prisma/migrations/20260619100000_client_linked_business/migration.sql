-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CLIENT_LINKED';

-- AlterTable: add nullable linkedBusinessId to Client
ALTER TABLE "Client" ADD COLUMN "linkedBusinessId" TEXT;

-- CreateIndex: partial unique so NULL entries (manual clients) don't collide
-- PG treats NULLs as distinct, so this unique constraint only de-duplicates
-- rows where linkedBusinessId IS NOT NULL, which is exactly what we want.
CREATE UNIQUE INDEX "Client_businessId_linkedBusinessId_key"
  ON "Client"("businessId", "linkedBusinessId");
