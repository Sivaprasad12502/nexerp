-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "prefix" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "contactCode" TEXT,
    "secondaryEmail" TEXT,
    "secondaryPhone" TEXT,
    "image" TEXT,
    "panNumber" TEXT,
    "aadhaarNumber" TEXT,
    "passportNumber" TEXT,
    "linkedinUrl" TEXT,
    "xUrl" TEXT,
    "facebookUrl" TEXT,
    "githubUrl" TEXT,
    "addressCountry" TEXT,
    "state" TEXT,
    "district" TEXT,
    "city" TEXT,
    "building" TEXT,
    "postalCode" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_businessId_status_idx" ON "Contact"("businessId", "status");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
