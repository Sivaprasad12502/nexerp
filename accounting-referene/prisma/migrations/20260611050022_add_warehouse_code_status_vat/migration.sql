-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "warehouseCode" TEXT,
ADD COLUMN     "warehouseStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
