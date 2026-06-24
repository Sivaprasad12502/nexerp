/**
 * One-time backfill: create payment receipts for historical approved invoice payments.
 * Run after migration 20260623120000_payment_allocation_payment_id:
 *   npx tsx scripts/backfill-payment-receipt-allocations.ts
 */
import { backfillPaymentReceiptsFromPayments } from "../lib/payment-receipt-sync";

async function main() {
  const created = await backfillPaymentReceiptsFromPayments();
  console.log(`Backfill complete: ${created} payment receipt(s) created.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
