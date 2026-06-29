/**
 * One-time backfill: create payout receipts for all paid expenditures.
 * Run: npx tsx scripts/backfill-payout-receipt-allocations.ts
 */
import { backfillAllPayoutReceipts } from "../lib/payout-receipt-sync";

async function main() {
  const created = await backfillAllPayoutReceipts();
  console.log(`Backfill complete: ${created} payout receipt(s) created.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
