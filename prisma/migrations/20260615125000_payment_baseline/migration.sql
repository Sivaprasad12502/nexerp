-- Gap-fill: Payment table added via "prisma db push" after Document was created.
-- Also reconciles schema drift left by 20260615120000_documents_and_po_workflow,
-- which uses CREATE TABLE IF NOT EXISTS so it was a no-op on the real DB (Document
-- already existed from db push without those defaults), but sets defaults on shadow DB.
-- Idempotent — safe no-op on an existing database.

-- ─── 0. Reconcile drift from 20260615120000 ──────────────────────────────────
ALTER TABLE "Document" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "attachments" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"                TEXT NOT NULL,
  "businessId"        TEXT NOT NULL,
  "documentId"        TEXT NOT NULL,
  "amountReceived"    DOUBLE PRECISION NOT NULL,
  "transactionCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tdsWithheld"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountToSettle"    DOUBLE PRECISION NOT NULL,
  "paymentDate"       TIMESTAMP(3) NOT NULL,
  "method"            "PaymentMethod" NOT NULL DEFAULT 'ACCOUNT_TRANSFER',
  "refId"             TEXT,
  "notes"             TEXT,
  "attachments"       TEXT[],
  "status"            "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "recordedByUserId"  TEXT,
  "recordedByName"    TEXT,
  "approvedByUserId"  TEXT,
  "approvedAt"        TIMESTAMP(3),
  "paymentAccountId"  TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Payment_documentId_idx"
  ON "Payment"("documentId");

CREATE INDEX IF NOT EXISTS "Payment_businessId_status_idx"
  ON "Payment"("businessId", status);

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_businessId_fkey";

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_documentId_fkey";

DO $$
BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_paymentAccountId_fkey"
    FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_paymentAccountId_fkey";
