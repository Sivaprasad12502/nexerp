import type { PaymentAccount } from "@/lib/hooks/use-payment-accounts";

export function getCustomFieldValue(
  account: PaymentAccount,
  ...labels: string[]
): string {
  const fields = Array.isArray(account.customFields) ? account.customFields : [];
  for (const label of labels) {
    const found = fields.find(
      (f) => f.label.trim().toLowerCase() === label.trim().toLowerCase(),
    );
    if (found?.value?.trim()) return found.value.trim();
  }
  return "";
}

export function cellOrDash(value: string | null | undefined) {
  const v = value?.trim();
  return v ? v : "—";
}

export function formatAccountType(value: string | null | undefined) {
  if (!value) return "—";
  if (value === "SAVINGS") return "Savings";
  if (value === "CURRENT") return "Current";
  return value;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function employeeName(account: PaymentAccount) {
  return account.accountHolderName?.trim() || account.displayName?.trim() || "—";
}

export type SortDirection = "asc" | "desc";

export function compareValues(a: string, b: string, dir: SortDirection) {
  const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? result : -result;
}
