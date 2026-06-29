"use client";

import { useMemo, useState } from "react";

import type { PaymentAccount } from "@/lib/hooks/use-payment-accounts";
import {
  cellOrDash,
  compareValues,
  employeeName,
  fmtDate,
  getCustomFieldValue,
  type SortDirection,
} from "./payment-account-utils";
import { PaymentAccountRowActions } from "./payment-account-row-actions";
import { SortFilterTh, thClass } from "./sort-filter-th";

type EmployeeColumnKey =
  | "employeeId"
  | "name"
  | "department"
  | "level"
  | "phone"
  | "country"
  | "currency"
  | "createdAt";

const EMPLOYEE_COLUMNS: { key: EmployeeColumnKey; label: string }[] = [
  { key: "employeeId", label: "Employee ID" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "level", label: "Level" },
  { key: "phone", label: "Phone:" },
  { key: "country", label: "Country:" },
  { key: "currency", label: "Currency" },
  { key: "createdAt", label: "Created At" },
];

function employeeCellValue(account: PaymentAccount, key: EmployeeColumnKey): string {
  switch (key) {
    case "employeeId":
      return getCustomFieldValue(account, "Employee Id", "Employee ID");
    case "name":
      return employeeName(account);
    case "department":
      return account.department ?? "";
    case "level":
      return getCustomFieldValue(account, "Level");
    case "phone":
      return getCustomFieldValue(account, "Phone Number", "Phone");
    case "country":
      return account.country ?? "";
    case "currency":
      return account.currency ?? "";
    case "createdAt":
      return fmtDate(account.createdAt);
    default:
      return "";
  }
}

function displayEmployeeCell(account: PaymentAccount, key: EmployeeColumnKey) {
  if (key === "createdAt") return fmtDate(account.createdAt);
  return cellOrDash(employeeCellValue(account, key));
}

export function EmployeeAccountsTable({
  accounts,
  onEdit,
  onToggleStatus,
}: {
  accounts: PaymentAccount[];
  onEdit: (account: PaymentAccount) => void;
  onToggleStatus: (account: PaymentAccount) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<EmployeeColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Partial<Record<EmployeeColumnKey, string>>>({});

  const rows = useMemo(() => {
    let result = [...accounts];

    for (const col of EMPLOYEE_COLUMNS) {
      const filter = filters[col.key]?.trim().toLowerCase();
      if (!filter) continue;
      result = result.filter((account) =>
        employeeCellValue(account, col.key).toLowerCase().includes(filter),
      );
    }

    if (sortKey) {
      result.sort((a, b) =>
        compareValues(
          employeeCellValue(a, sortKey),
          employeeCellValue(b, sortKey),
          sortDir,
        ),
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

  const handleSort = (key: EmployeeColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${thClass} w-10`}>
              <input
                type="checkbox"
                className="accent-[#7438dc]"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all employee accounts"
              />
            </th>
            {EMPLOYEE_COLUMNS.map((col) => (
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
              {EMPLOYEE_COLUMNS.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-3 py-3 text-zinc-700">
                  {displayEmployeeCell(account, col.key)}
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

export function employeeAccountsCsvHeaders() {
  return EMPLOYEE_COLUMNS.map((c) => c.label);
}

export function employeeAccountsCsvRow(account: PaymentAccount) {
  return EMPLOYEE_COLUMNS.map((col) => employeeCellValue(account, col.key));
}
