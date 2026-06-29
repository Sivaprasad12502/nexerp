"use client";

import { useMemo, useState } from "react";

import type { PaymentAccount } from "@/lib/hooks/use-payment-accounts";
import {
  cellOrDash,
  compareValues,
  formatAccountType,
  getCustomFieldValue,
  type SortDirection,
} from "./payment-account-utils";
import { PaymentAccountRowActions } from "./payment-account-row-actions";
import { SortFilterTh, thClass } from "./sort-filter-th";

type BankColumnKey =
  | "bankName"
  | "accountNumber"
  | "sortCode"
  | "ifsc"
  | "iban"
  | "swift"
  | "accountHolderName"
  | "accountType"
  | "country";

const BANK_COLUMNS: { key: BankColumnKey; label: string }[] = [
  { key: "bankName", label: "Bank Name" },
  { key: "accountNumber", label: "Account Number" },
  { key: "sortCode", label: "Sort Code" },
  { key: "ifsc", label: "IFSC" },
  { key: "iban", label: "IBAN" },
  { key: "swift", label: "SWIFT" },
  { key: "accountHolderName", label: "Account Holder Name" },
  { key: "accountType", label: "Account Type" },
  { key: "country", label: "Country" },
];

function bankCellValue(account: PaymentAccount, key: BankColumnKey): string {
  switch (key) {
    case "bankName":
      return account.bankName ?? "";
    case "accountNumber":
      return account.accountNumber ?? "";
    case "sortCode":
      return getCustomFieldValue(account, "Sort Code", "Sort code");
    case "ifsc":
      return account.ifsc ?? "";
    case "iban":
      return getCustomFieldValue(account, "IBAN", "Iban");
    case "swift":
      return account.swift ?? "";
    case "accountHolderName":
      return account.accountHolderName ?? "";
    case "accountType":
      return formatAccountType(account.accountType);
    case "country":
      return account.country ?? "";
    default:
      return "";
  }
}

function displayBankCell(account: PaymentAccount, key: BankColumnKey) {
  if (key === "accountType") return formatAccountType(account.accountType);
  return cellOrDash(bankCellValue(account, key));
}

export function BankAccountsTable({
  accounts,
  onEdit,
  onToggleStatus,
}: {
  accounts: PaymentAccount[];
  onEdit: (account: PaymentAccount) => void;
  onToggleStatus: (account: PaymentAccount) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<BankColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Partial<Record<BankColumnKey, string>>>({});

  const rows = useMemo(() => {
    let result = [...accounts];

    for (const col of BANK_COLUMNS) {
      const filter = filters[col.key]?.trim().toLowerCase();
      if (!filter) continue;
      result = result.filter((account) =>
        bankCellValue(account, col.key).toLowerCase().includes(filter),
      );
    }

    if (sortKey) {
      result.sort((a, b) =>
        compareValues(bankCellValue(a, sortKey), bankCellValue(b, sortKey), sortDir),
      );
    }

    return result;
  }, [accounts, filters, sortDir, sortKey]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: BankColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${thClass} w-10`}>
              <input
                type="checkbox"
                className="accent-[#7438dc]"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all bank accounts"
              />
            </th>
            {BANK_COLUMNS.map((col) => (
              <SortFilterTh
                key={col.key}
                label={col.label}
                sortDir={sortKey === col.key ? sortDir : null}
                filterValue={filters[col.key]}
                onSort={() => handleSort(col.key)}
                onFilterChange={(value) =>
                  setFilters((prev) => ({ ...prev, [col.key]: value }))
                }
              />
            ))}
            <th className={`${thClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((account) => (
            <tr key={account.id} className="hover:bg-zinc-50/80">
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  className="accent-[#7438dc]"
                  checked={selected.has(account.id)}
                  onChange={() => toggleOne(account.id)}
                  aria-label={`Select ${account.displayName}`}
                />
              </td>
              {BANK_COLUMNS.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-3 py-3 text-zinc-700">
                  {displayBankCell(account, col.key)}
                </td>
              ))}
              <td className="px-3 py-3">
                <PaymentAccountRowActions
                  account={account}
                  accounts={accounts}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function bankAccountsCsvHeaders() {
  return BANK_COLUMNS.map((c) => c.label);
}

export function bankAccountsCsvRow(account: PaymentAccount) {
  return BANK_COLUMNS.map((col) => bankCellValue(account, col.key));
}
