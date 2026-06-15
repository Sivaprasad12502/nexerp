-- AlterTable: add approvalToken to Document
ALTER TABLE "Document" ADD COLUMN "approvalToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_approvalToken_key" ON "Document"("approvalToken");
