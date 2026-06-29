-- CreateEnum
CREATE TYPE "PaymentReceiptType" AS ENUM ('PAYMENT_RECEIPT', 'CLIENT_ADVANCE');

-- CreateEnum
CREATE TYPE "PaymentReceiptStatus" AS ENUM ('ACTIVE', 'SETTLED', 'ADVANCE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "type" "PaymentReceiptType" NOT NULL DEFAULT 'PAYMENT_RECEIPT',
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-IN',
    "decimalDigits" INTEGER NOT NULL DEFAULT 2,
    "customCurrencySymbol" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptLine" (
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

    CONSTRAINT "PaymentReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amountAllocated" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PaymentReceiptAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReceipt_businessId_status_idx" ON "PaymentReceipt"("businessId", "status");

-- CreateIndex
CREATE INDEX "PaymentReceipt_businessId_receiptDate_idx" ON "PaymentReceipt"("businessId", "receiptDate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_businessId_receiptNumber_key" ON "PaymentReceipt"("businessId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptLine" ADD CONSTRAINT "PaymentReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptLine" ADD CONSTRAINT "PaymentReceiptLine_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
