-- Link payment receipt allocations to source invoice payments (for direct + receipt flows).
ALTER TABLE "PaymentReceiptAllocation" ADD COLUMN "paymentId" TEXT;

CREATE UNIQUE INDEX "PaymentReceiptAllocation_paymentId_key" ON "PaymentReceiptAllocation"("paymentId");

ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
