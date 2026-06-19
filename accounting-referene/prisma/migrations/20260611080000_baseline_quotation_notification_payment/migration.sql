-- Gap-fill migration: captures schema that was applied via "prisma db push" and
-- never recorded as a migration file. All statements are idempotent (IF NOT EXISTS
-- / DO $$ EXCEPTION WHEN duplicate_object $$) so they are safe no-ops on an
-- existing database.

-- ─── 1. QuotationStatus enum (original values; approval-workflow migration adds more) ────

DO $$
BEGIN
  CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SAVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 2. Quotation table (base columns; approval-workflow migration adds approval fields) ──

CREATE TABLE IF NOT EXISTS "Quotation" (
  "id"                 TEXT NOT NULL,
  "businessId"         TEXT NOT NULL,
  "quotationNumber"    TEXT NOT NULL,
  "quotationDate"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTillDate"      TIMESTAMP(3),
  "quotationTitle"     TEXT,
  "subtitle"           TEXT,
  "logo"               TEXT,
  "currency"           TEXT NOT NULL DEFAULT 'AED',
  "fromName"           TEXT,
  "fromAddress"        TEXT,
  "fromGstin"          TEXT,
  "fromPan"            TEXT,
  "clientId"           TEXT,
  "clientName"         TEXT,
  "clientAddress"      TEXT,
  "clientGstin"        TEXT,
  "shipFromWarehouseId" TEXT,
  "shippingName"       TEXT,
  "shippingAddress"    TEXT,
  "shippingPostalCode" TEXT,
  "shippingState"      TEXT,
  "transporterName"    TEXT,
  "distance"           TEXT,
  "vehicleType"        TEXT,
  "vehicleNumber"      TEXT,
  "transportDocNumber" TEXT,
  "transactionType"    TEXT,
  "discountLabel"      TEXT,
  "discountAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "additionalCharges"  JSONB NOT NULL DEFAULT '[]',
  "subTotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTax"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalDiscount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalQuantity"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountInWords"      TEXT,
  "termsAndConditions" TEXT,
  "notes"              TEXT,
  "signature"          TEXT,
  "additionalInfo"     TEXT,
  "contactDetails"     TEXT,
  "attachments"        TEXT[],
  "customFields"       JSONB NOT NULL DEFAULT '[]',
  "settings"           JSONB NOT NULL DEFAULT '{}',
  "status"             "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "Quotation"
    ADD CONSTRAINT "Quotation_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Quotation" VALIDATE CONSTRAINT "Quotation_businessId_fkey";

DO $$
BEGIN
  ALTER TABLE "Quotation"
    ADD CONSTRAINT "Quotation_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Quotation" VALIDATE CONSTRAINT "Quotation_clientId_fkey";

CREATE INDEX IF NOT EXISTS "Quotation_businessId_status_idx"
  ON "Quotation"("businessId", status);

-- ─── 3. QuotationItem table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "QuotationItem" (
  "id"          TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "productId"   TEXT,
  "name"        TEXT NOT NULL,
  "sku"         TEXT,
  "hsnSac"      TEXT,
  "unit"        TEXT,
  "description" TEXT,
  "image"       TEXT,
  "groupName"   TEXT,
  "quantity"    DOUBLE PRECISION NOT NULL DEFAULT 1,
  "rate"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "QuotationItem"
    ADD CONSTRAINT "QuotationItem_quotationId_fkey"
    FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "QuotationItem" VALIDATE CONSTRAINT "QuotationItem_quotationId_fkey";

DO $$
BEGIN
  ALTER TABLE "QuotationItem"
    ADD CONSTRAINT "QuotationItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "QuotationItem" VALIDATE CONSTRAINT "QuotationItem_productId_fkey";

-- ─── 4. NotificationType enum ─────────────────────────────────────────────────
-- CLIENT_LINKED is added separately in migration 20260619100000_client_linked_business

DO $$
BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'QUOTATION_SENT',
    'QUOTATION_VIEWED',
    'QUOTATION_APPROVED',
    'QUOTATION_REJECTED',
    'VENDOR_LINKED',
    'PURCHASE_ORDER_RECEIVED',
    'INVOICE_RECEIVED',
    'PAYMENT_RECEIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 5. Notification table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "type"       "NotificationType" NOT NULL,
  "isRead"     BOOLEAN NOT NULL DEFAULT false,
  "entityType" TEXT,
  "entityId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Notification" VALIDATE CONSTRAINT "Notification_userId_fkey";

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON "Notification"("userId", "isRead");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");

-- ─── 6. BusinessSettings table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "BusinessSettings" (
  "id"                TEXT NOT NULL,
  "businessId"        TEXT NOT NULL,
  "bankName"          TEXT,
  "bankAccountName"   TEXT,
  "bankAccountNumber" TEXT,
  "bankIfsc"          TEXT,
  "bankBranch"        TEXT,
  "bankSwift"         TEXT,
  "upiId"             TEXT,
  "upiQrUrl"          TEXT,
  "letterheadUrl"     TEXT,
  "footerText"        TEXT,
  "watermarkText"     TEXT,
  "watermarkUrl"      TEXT,
  "defaultTemplate"   TEXT,
  "defaultThemeColor" TEXT,
  "defaultFontFamily" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessSettings_businessId_key"
  ON "BusinessSettings"("businessId");

DO $$
BEGIN
  ALTER TABLE "BusinessSettings"
    ADD CONSTRAINT "BusinessSettings_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "BusinessSettings" VALIDATE CONSTRAINT "BusinessSettings_businessId_fkey";

-- ─── 7. PasswordResetToken table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"        TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key"
  ON "PasswordResetToken"("token");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
  ON "PasswordResetToken"("userId");

DO $$
BEGIN
  ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "PasswordResetToken" VALIDATE CONSTRAINT "PasswordResetToken_userId_fkey";

-- ─── 8. Payment enums ─────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE "PaymentAccountType" AS ENUM ('BANK', 'EMPLOYEE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM (
    'ACCOUNT_TRANSFER', 'CASH', 'CHEQUE', 'UPI', 'CARD', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 9. PaymentAccount table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PaymentAccount" (
  "id"                  TEXT NOT NULL,
  "businessId"          TEXT NOT NULL,
  "type"                "PaymentAccountType" NOT NULL DEFAULT 'BANK',
  "displayName"         TEXT NOT NULL,
  "accountHolderName"   TEXT,
  "bankName"            TEXT,
  "accountNumber"       TEXT,
  "ifsc"                TEXT,
  "branch"              TEXT,
  "accountType"         TEXT,
  "upiId"               TEXT,
  "country"             TEXT,
  "currency"            TEXT,
  "swift"               TEXT,
  "customFields"        JSONB,
  "linkedBankAccountId" TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentAccount_businessId_idx"
  ON "PaymentAccount"("businessId");

DO $$
BEGIN
  ALTER TABLE "PaymentAccount"
    ADD CONSTRAINT "PaymentAccount_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "PaymentAccount" VALIDATE CONSTRAINT "PaymentAccount_businessId_fkey";
