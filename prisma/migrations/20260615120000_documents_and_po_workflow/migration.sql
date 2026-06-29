-- Documents, document conversion audit, and quotation PO workflow status

-- ─── 1. New enums ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE "DocumentType" AS ENUM (
    'INVOICE',
    'PURCHASE_ORDER',
    'SALES_ORDER',
    'PROFORMA_INVOICE',
    'DELIVERY_CHALLAN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ─── 2. Quotation workflow extensions ─────────────────────────────────────────

ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CREATED';

ALTER TYPE "QuotationActivityAction" ADD VALUE IF NOT EXISTS 'QUOTATION_PO_CREATED';

ALTER TABLE "Quotation"
  ADD COLUMN IF NOT EXISTS "purchaseOrderCreatedAt" TIMESTAMP(3);

-- ─── 3. Document table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Document" (
  "id"                  TEXT NOT NULL,
  "businessId"          TEXT NOT NULL,
  "type"                "DocumentType" NOT NULL,
  "documentNumber"      TEXT NOT NULL,
  "documentDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTillDate"       TIMESTAMP(3),
  "title"               TEXT,
  "subtitle"            TEXT,
  "logo"                TEXT,
  "currency"            TEXT NOT NULL DEFAULT 'AED',
  "fromName"            TEXT,
  "fromAddress"         TEXT,
  "fromGstin"           TEXT,
  "fromPan"             TEXT,
  "clientId"            TEXT,
  "clientName"          TEXT,
  "clientAddress"       TEXT,
  "clientGstin"         TEXT,
  "shipFromWarehouseId" TEXT,
  "shippingName"        TEXT,
  "shippingAddress"     TEXT,
  "shippingPostalCode"  TEXT,
  "shippingState"       TEXT,
  "transporterName"     TEXT,
  "distance"            TEXT,
  "vehicleType"         TEXT,
  "vehicleNumber"       TEXT,
  "transportDocNumber"  TEXT,
  "transactionType"     TEXT,
  "discountLabel"       TEXT,
  "discountAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "additionalCharges"   JSONB NOT NULL DEFAULT '[]',
  "subTotal"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTax"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalDiscount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalQuantity"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountInWords"       TEXT,
  "termsAndConditions"  TEXT,
  "notes"               TEXT,
  "signature"           TEXT,
  "additionalInfo"      TEXT,
  "contactDetails"      TEXT,
  "attachments"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "customFields"        JSONB NOT NULL DEFAULT '[]',
  "settings"            JSONB NOT NULL DEFAULT '{}',
  "status"              "DocumentStatus" NOT NULL DEFAULT 'ISSUED',
  "createdByUserId"     TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Document" VALIDATE CONSTRAINT "Document_businessId_fkey";

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Document" VALIDATE CONSTRAINT "Document_clientId_fkey";

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Document" VALIDATE CONSTRAINT "Document_createdByUserId_fkey";

CREATE INDEX IF NOT EXISTS "Document_businessId_type_status_idx"
  ON "Document"("businessId", "type", "status");

CREATE INDEX IF NOT EXISTS "Document_businessId_createdAt_idx"
  ON "Document"("businessId", "createdAt");

-- ─── 4. DocumentItem table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DocumentItem" (
  "id"          TEXT NOT NULL,
  "documentId"  TEXT NOT NULL,
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
  CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "DocumentItem"
    ADD CONSTRAINT "DocumentItem_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "DocumentItem" VALIDATE CONSTRAINT "DocumentItem_documentId_fkey";

DO $$
BEGIN
  ALTER TABLE "DocumentItem"
    ADD CONSTRAINT "DocumentItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "DocumentItem" VALIDATE CONSTRAINT "DocumentItem_productId_fkey";

-- ─── 5. DocumentConversion audit table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DocumentConversion" (
  "id"              TEXT NOT NULL,
  "businessId"      TEXT NOT NULL,
  "sourceType"      TEXT NOT NULL,
  "sourceId"        TEXT NOT NULL,
  "targetType"      TEXT NOT NULL,
  "targetId"        TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentConversion_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "DocumentConversion"
    ADD CONSTRAINT "DocumentConversion_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "DocumentConversion" VALIDATE CONSTRAINT "DocumentConversion_businessId_fkey";

DO $$
BEGIN
  ALTER TABLE "DocumentConversion"
    ADD CONSTRAINT "DocumentConversion_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "DocumentConversion" VALIDATE CONSTRAINT "DocumentConversion_createdByUserId_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentConversion_sourceType_sourceId_targetType_key"
  ON "DocumentConversion"("sourceType", "sourceId", "targetType");

CREATE INDEX IF NOT EXISTS "DocumentConversion_businessId_sourceType_sourceId_idx"
  ON "DocumentConversion"("businessId", "sourceType", "sourceId");
