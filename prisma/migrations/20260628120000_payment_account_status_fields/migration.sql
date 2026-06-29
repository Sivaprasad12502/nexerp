-- Add status, employee/ledger fields, and linked-bank self-relation to PaymentAccount

CREATE TYPE "PaymentAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "PaymentAccount" ADD COLUMN "status" "PaymentAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "PaymentAccount" ADD COLUMN "department" TEXT;
ALTER TABLE "PaymentAccount" ADD COLUMN "ledgerName" TEXT;

ALTER TABLE "PaymentAccount"
  ADD CONSTRAINT "PaymentAccount_linkedBankAccountId_fkey"
  FOREIGN KEY ("linkedBankAccountId") REFERENCES "PaymentAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PaymentAccount_businessId_type_status_idx"
  ON "PaymentAccount"("businessId", "type", "status");
