"use client";

/**
 * Re-export shared bank account modal for document/payment flows.
 * Opens directly to bank form (no type picker).
 */
export {
  AddBankAccountModal as AddPaymentAccountModal,
  type PaymentAccount,
} from "@/components/payment-accounts";
