-- Add city, address, panNumber to Business
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "city"      TEXT,
  ADD COLUMN IF NOT EXISTS "address"   TEXT,
  ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
