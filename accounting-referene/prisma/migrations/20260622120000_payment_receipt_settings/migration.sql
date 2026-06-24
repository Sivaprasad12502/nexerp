-- Design settings for payment receipt preview (template, color, font, etc.)
ALTER TABLE "PaymentReceipt" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';
