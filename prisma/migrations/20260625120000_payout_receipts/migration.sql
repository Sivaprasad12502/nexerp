-- CreateEnum
CREATE TYPE "PayoutReceiptType" AS ENUM ('PAYOUT_RECEIPT', 'VENDOR_ADVANCE');

-- CreateEnum
CREATE TYPE "PayoutReceiptStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SETTLED', 'ADVANCE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "PayoutReceipt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "type" "PayoutReceiptType" NOT NULL DEFAULT 'PAYOUT_RECEIPT',
    "status" "PayoutReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "vendorId" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-IN',
    "decimalDigits" INTEGER NOT NULL DEFAULT 2,
    "customCurrencySymbol" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emailSentAt" TIMESTAMP(3),
    "approvalToken" TEXT,
    "notes" TEXT,
    "signature" TEXT,
    "additionalInfo" TEXT,
    "contactDetails" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "paymentAccountId" TEXT,
    "method" "PaymentMethod" NOT NULL DEFAULT 'ACCOUNT_TRANSFER',
    "refId" TEXT,
    "amountReceived" DOUBLE PRECISION NOT NULL,
    "amountInBaseCurrency" DOUBLE PRECISION,
    "transactionCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PayoutReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amountAllocated" DOUBLE PRECISION NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "PayoutReceiptAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutReceipt_approvalToken_key" ON "PayoutReceipt"("approvalToken");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutReceipt_businessId_receiptNumber_key" ON "PayoutReceipt"("businessId", "receiptNumber");

-- CreateIndex
CREATE INDEX "PayoutReceipt_businessId_status_idx" ON "PayoutReceipt"("businessId", "status");

-- CreateIndex
CREATE INDEX "PayoutReceipt_businessId_receiptDate_idx" ON "PayoutReceipt"("businessId", "receiptDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutReceiptAllocation_paymentId_key" ON "PayoutReceiptAllocation"("paymentId");

-- AddForeignKey
ALTER TABLE "PayoutReceipt" ADD CONSTRAINT "PayoutReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceipt" ADD CONSTRAINT "PayoutReceipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceiptLine" ADD CONSTRAINT "PayoutReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PayoutReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceiptLine" ADD CONSTRAINT "PayoutReceiptLine_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceiptAllocation" ADD CONSTRAINT "PayoutReceiptAllocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PayoutReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceiptAllocation" ADD CONSTRAINT "PayoutReceiptAllocation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReceiptAllocation" ADD CONSTRAINT "PayoutReceiptAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
