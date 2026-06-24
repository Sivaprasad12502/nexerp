-- Add public view token for payment receipts (email share links)
ALTER TABLE "PaymentReceipt" ADD COLUMN "approvalToken" TEXT;

CREATE UNIQUE INDEX "PaymentReceipt_approvalToken_key" ON "PaymentReceipt"("approvalToken");
