-- AlterTable: add address and contact fields to Warehouse
ALTER TABLE "Warehouse" ADD COLUMN "country"       TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "state"         TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "city"          TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "postalCode"    TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "streetAddress" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "email"         TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "phone"         TEXT;
