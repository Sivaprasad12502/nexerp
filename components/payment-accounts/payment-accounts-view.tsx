"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Download,
  Eye,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AddBankAccountModal,
  AddEmployeeAccountModal,
  AddOtherAccountModal,
  AddPaymentAccountTypeModal,
  BankingPaymentsHeader,
  BankAccountsTable,
  bankAccountsCsvHeaders,
  bankAccountsCsvRow,
  EmployeeAccountsTable,
  employeeAccountsCsvHeaders,
  employeeAccountsCsvRow,
  type AccountTypeChoice,
} from "@/components/payment-accounts";
import {
  usePaymentAccounts,
  useUpdatePaymentAccount,
  type PaymentAccount,
  type PaymentAccountFilters,
} from "@/lib/hooks/use-payment-accounts";
import { fmtDate } from "@/components/payment-accounts/payment-account-utils";

export type PaymentAccountsMainTab = "all" | "bank" | "employee";
type StatusTab = "ACTIVE" | "INACTIVE";

type ColumnKey =
  | "index"
  | "displayName"
  | "accountType"
  | "linkedBank"
  | "linkedEmployee"
  | "linkedLedger"
  | "vpa"
  | "createdAt";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  index: "#",
  displayName: "Payment Account",
  accountType: "Account Type",
  linkedBank: "Linked Bank",
  linkedEmployee: "Linked Employee",
  linkedLedger: "Linked Ledger",
  vpa: "VPA",
  createdAt: "Created At",
};

function accountTypeLabel(type: string) {
  if (type === "BANK") return "Bank";
  if (type === "EMPLOYEE") return "Employee";
  if (type === "OTHER") return "Other";
  return type;
}

function exportCsv(accounts: PaymentAccount[], mainTab: PaymentAccountsMainTab) {
  let headers: string[];
  let rows: string[][];

  if (mainTab === "bank") {
    headers = bankAccountsCsvHeaders();
    rows = accounts.map((a) => bankAccountsCsvRow(a));
  } else if (mainTab === "employee") {
    headers = employeeAccountsCsvHeaders();
    rows = accounts.map((a) => employeeAccountsCsvRow(a));
  } else {
    headers = [
      "Payment Account",
      "Account Type",
      "Linked Bank",
      "Linked Ledger",
      "VPA",
      "Status",
      "Created At",
    ];
    rows = accounts.map((a) => [
      a.displayName,
      accountTypeLabel(a.type),
      a.linkedBankAccount?.displayName ?? "",
      a.ledgerName ?? "",
      a.upiId ?? "",
      a.status,
      fmtDate(a.createdAt),
    ]);
  }
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payment-accounts-${mainTab}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildFilters(mainTab: PaymentAccountsMainTab, statusTab: StatusTab): PaymentAccountFilters {
  const filters: PaymentAccountFilters = { status: statusTab };
  if (mainTab === "bank") filters.bankOnly = true;
  else if (mainTab === "employee") filters.type = "EMPLOYEE";
  return filters;
}

export function PaymentAccountsView({
  defaultMainTab,
}: {
  defaultMainTab: PaymentAccountsMainTab;
}) {
  const mainTab = defaultMainTab;
  const [statusTab, setStatusTab] = useState<StatusTab>("ACTIVE");

  const filters = buildFilters(mainTab, statusTab);
  const { data, isLoading } = usePaymentAccounts(filters);
  const updateMutation = useUpdatePaymentAccount();

  const accounts = data?.accounts ?? [];

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    index: true,
    displayName: true,
    accountType: true,
    linkedBank: true,
    linkedEmployee: true,
    linkedLedger: true,
    vpa: true,
    createdAt: true,
  });

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null);

  const tabLabel = useMemo(() => {
    if (mainTab === "bank") return "Bank Accounts";
    if (mainTab === "employee") return "Employee Accounts";
    return "All Payment Accounts";
  }, [mainTab]);

  const handleTypeContinue = (type: AccountTypeChoice) => {
    setTypeModalOpen(false);
    setEditAccount(null);
    if (type === "BANK") setBankModalOpen(true);
    else if (type === "EMPLOYEE") setEmployeeModalOpen(true);
    else setOtherModalOpen(true);
  };

  const handleQuickAdd = (type: AccountTypeChoice) => {
    setEditAccount(null);
    if (type === "BANK") setBankModalOpen(true);
    else if (type === "EMPLOYEE") setEmployeeModalOpen(true);
    else setOtherModalOpen(true);
  };

  const openNewAccount = () => {
    setEditAccount(null);
    setTypeModalOpen(true);
  };

  const openEdit = (account: PaymentAccount) => {
    setEditAccount(account);
    if (account.type === "EMPLOYEE") setEmployeeModalOpen(true);
    else if (account.type === "OTHER") setOtherModalOpen(true);
    else setBankModalOpen(true);
  };

  const toggleStatus = (account: PaymentAccount) => {
    const next = account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateMutation.mutate({
      id: account.id,
      data: { status: next },
    });
  };

  const handleModalClose = () => {
    setEditAccount(null);
    setBankModalOpen(false);
    setEmployeeModalOpen(false);
    setOtherModalOpen(false);
  };

  const onAdded = () => {
    handleModalClose();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      <BankingPaymentsHeader
        onNewAccount={openNewAccount}
        onQuickAdd={handleQuickAdd}
      >
        <div className="mt-4 flex gap-6 border-b border-zinc-100 pb-0">
          {(["ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={`border-b-2 pb-2 text-sm font-medium ${
                statusTab === s
                  ? "border-[#7438dc] text-[#7438dc]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {s === "ACTIVE" ? "Active Accounts" : "Inactive Accounts"}
            </button>
          ))}
        </div>
      </BankingPaymentsHeader>

      <div className=" px-4 py-4 sm:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">
            Showing {accounts.length === 0 ? 0 : 1} to {accounts.length} of {accounts.length}{" "}
            {tabLabel}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(accounts, mainTab)}
              disabled={accounts.length === 0}
            >
              <Download className="mr-1 size-4" />
              Download CSV
            </Button>
            {mainTab === "all" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LayoutGrid className="mr-1 size-4" />
                    Show/Hide Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({ ...prev, [key]: !!checked }))
                      }
                    >
                      {COLUMN_LABELS[key]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-[#7438dc]" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              No payment accounts found. Click &quot;New Payment Account&quot; to add one.
            </div>
          ) : mainTab === "bank" ? (
            <BankAccountsTable
              accounts={accounts}
              onEdit={openEdit}
              onToggleStatus={toggleStatus}
            />
          ) : mainTab === "employee" ? (
            <EmployeeAccountsTable
              accounts={accounts}
              onEdit={openEdit}
              onToggleStatus={toggleStatus}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {visibleColumns.index && <th className="px-4 py-3">#</th>}
                    {visibleColumns.displayName && <th className="px-4 py-3">Payment Account</th>}
                    {visibleColumns.accountType && <th className="px-4 py-3">Account Type</th>}
                    {visibleColumns.linkedBank && <th className="px-4 py-3">Linked Bank</th>}
                    {visibleColumns.linkedEmployee && <th className="px-4 py-3">Linked Employee</th>}
                    {visibleColumns.linkedLedger && <th className="px-4 py-3">Linked Ledger</th>}
                    {visibleColumns.vpa && <th className="px-4 py-3">VPA</th>}
                    {visibleColumns.createdAt && <th className="px-4 py-3">Created At</th>}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, i) => (
                    <tr key={account.id} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                      {visibleColumns.index && (
                        <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                      )}
                      {visibleColumns.displayName && (
                        <td className="px-4 py-3 font-medium text-zinc-900">{account.displayName}</td>
                      )}
                      {visibleColumns.accountType && (
                        <td className="px-4 py-3 text-zinc-600">{accountTypeLabel(account.type)}</td>
                      )}
                      {visibleColumns.linkedBank && (
                        <td className="px-4 py-3 text-zinc-600">
                          {account.linkedBankAccount?.displayName ?? "—"}
                        </td>
                      )}
                      {visibleColumns.linkedEmployee && (
                        <td className="px-4 py-3 text-zinc-400">—</td>
                      )}
                      {visibleColumns.linkedLedger && (
                        <td className="max-w-[180px] truncate px-4 py-3 text-zinc-600">
                          {account.ledgerName ?? "—"}
                        </td>
                      )}
                      {visibleColumns.vpa && (
                        <td className="px-4 py-3 text-zinc-600">{account.upiId ?? "—"}</td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-4 py-3 text-zinc-600">{fmtDate(account.createdAt)}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex flex-col items-center rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-100"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="text-[10px]">More</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openEdit(account)}>
                                <Pencil className="mr-2 size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(account)}>
                                <Ban className="mr-2 size-4" />
                                {account.status === "ACTIVE" ? "Mark as Inactive" : "Mark as Active"}
                              </DropdownMenuItem>
                              {account.upiId && account.linkedBankAccountId && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const linked = accounts.find(
                                      (a) => a.id === account.linkedBankAccountId,
                                    );
                                    if (linked) openEdit(linked);
                                    else toast.info("Linked bank account not found");
                                  }}
                                >
                                  <Pencil className="mr-2 size-4" /> Edit Linked Bank Account
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toast.info("Ledger statements coming soon")}
                              >
                                <Eye className="mr-2 size-4" /> View Ledger Statement
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddPaymentAccountTypeModal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        onContinue={handleTypeContinue}
      />
      <AddBankAccountModal
        open={bankModalOpen}
        onClose={handleModalClose}
        onAdded={onAdded}
        initialData={editAccount?.type === "BANK" ? editAccount : null}
      />
      <AddEmployeeAccountModal
        open={employeeModalOpen}
        onClose={handleModalClose}
        onAdded={onAdded}
        initialData={editAccount?.type === "EMPLOYEE" ? editAccount : null}
      />
      <AddOtherAccountModal
        open={otherModalOpen}
        onClose={handleModalClose}
        onAdded={onAdded}
        initialData={editAccount?.type === "OTHER" ? editAccount : null}
      />
    </div>
  );
}
