-- CreateEnum
CREATE TYPE "VendorLeadStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "VendorLead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phoneCode" TEXT DEFAULT '+91',
    "phone" TEXT,
    "vendorType" "VendorType" NOT NULL DEFAULT 'INDIVIDUAL',
    "subject" TEXT,
    "notes" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "streetAddress" TEXT,
    "gstNumber" TEXT,
    "gstStateCode" TEXT,
    "panNumber" TEXT,
    "nameAsPerPan" TEXT,
    "workflowName" TEXT,
    "currentAssigneeId" TEXT,
    "currentStage" TEXT,
    "currentStatus" TEXT DEFAULT 'Pending',
    "status" "VendorLeadStatus" NOT NULL DEFAULT 'ACTIVE',
    "convertedVendorId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "paymentAccountId" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorLead_businessId_status_idx" ON "VendorLead"("businessId", "status");

-- CreateIndex
CREATE INDEX "VendorLead_businessId_createdAt_idx" ON "VendorLead"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "VendorLead" ADD CONSTRAINT "VendorLead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLead" ADD CONSTRAINT "VendorLead_convertedVendorId_fkey" FOREIGN KEY ("convertedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLead" ADD CONSTRAINT "VendorLead_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
