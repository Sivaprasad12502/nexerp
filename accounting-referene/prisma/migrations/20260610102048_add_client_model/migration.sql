-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "logo" TEXT,
    "businessName" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT,
    "city" TEXT,
    "clientType" "ClientType" NOT NULL DEFAULT 'COMPANY',
    "trn" TEXT,
    "vatNumber" TEXT,
    "taxTreatment" TEXT,
    "addressCountry" TEXT,
    "state" TEXT,
    "district" TEXT,
    "addressCity" TEXT,
    "buildingNumber" TEXT,
    "postalCode" TEXT,
    "streetAddress" TEXT,
    "shippingName" TEXT,
    "shippingCountry" TEXT,
    "shippingState" TEXT,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "shippingStreet" TEXT,
    "businessAlias" TEXT,
    "uniqueKey" TEXT,
    "email" TEXT,
    "showEmailInInvoice" BOOLEAN NOT NULL DEFAULT false,
    "phoneCode" TEXT DEFAULT '+971',
    "phone" TEXT,
    "showPhoneInInvoice" BOOLEAN NOT NULL DEFAULT false,
    "defaultDueDays" INTEGER,
    "paymentAccount" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_uniqueKey_key" ON "Client"("uniqueKey");

-- CreateIndex
CREATE INDEX "Client_businessId_status_idx" ON "Client"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContact_clientId_contactId_key" ON "ClientContact"("clientId", "contactId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
