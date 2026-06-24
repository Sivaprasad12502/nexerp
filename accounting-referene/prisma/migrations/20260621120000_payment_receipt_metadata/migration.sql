-- Add DRAFT to PaymentReceiptStatus
ALTER TYPE "PaymentReceiptStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'ACTIVE';

-- Optional receipt metadata (notes, signature, attachments, etc.)
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "signature" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "additionalInfo" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "contactDetails" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
