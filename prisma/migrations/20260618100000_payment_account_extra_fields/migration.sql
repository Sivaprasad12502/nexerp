-- Add extended fields to PaymentAccount
ALTER TABLE "PaymentAccount"
  ADD COLUMN IF NOT EXISTS "country"             TEXT,
  ADD COLUMN IF NOT EXISTS "currency"            TEXT,
  ADD COLUMN IF NOT EXISTS "swift"               TEXT,
  ADD COLUMN IF NOT EXISTS "customFields"        JSONB,
  ADD COLUMN IF NOT EXISTS "linkedBankAccountId" TEXT;
