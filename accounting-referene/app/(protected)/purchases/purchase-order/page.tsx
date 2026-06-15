"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileText,
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  Check,
  Columns3,
  ArrowUpDown,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/document-adapter";
import {
  usePurchaseOrders,
  useConvertPoToPurchase,
  useDeletePurchaseOrder,
  type PurchaseOrderRow,
} from "@/lib/hooks/use-purchase-orders";
import { EmailPurchaseOrderSheet } from "./components/email-purchase-order-sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function poStatusBadge(po: PurchaseOrderRow) {
  if (po.status === "DRAFT" || (!po.sentAt && po.status === "ISSUED")) {
    return { label: "Created", className: "bg-orange-50 text-orange-700 ring-orange-200" };
  }
  if (po.sentAt) {
    return { label: "Purchase Order Sent", className: "bg-blue-50 text-blue-700 ring-blue-200" };
  }
  return { label: "Created", className: "bg-orange-50 text-orange-700 ring-orange-200" };
}

type ColumnKey =
  | "date"
  | "expand"
  | "poNumber"
  | "vendor"
  | "amount"
  | "status"
  | "paymentDate"
  | "convertPo"
  | "acceptance"
  | "emailVendor"
  | "subTotal"
  | "amountInr"
  | "tags"
  | "workflowName"
  | "assignee"
  | "stage"
  | "currentStatus"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  expand: true,
  poNumber: true,
  vendor: true,
  amount: true,
  status: true,
  paymentDate: true,
  convertPo: true,
  acceptance: true,
  emailVendor: true,
  subTotal: true,
  amountInr: true,
  tags: true,
  workflowName: true,
  assignee: true,
  stage: true,
  currentStatus: true,
  actions: true,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderPage() {
  const router = useRouter();
  const { data, isLoading, isError } = usePurchaseOrders();
  const convertMutation = useConvertPoToPurchase();
  const deleteMutation = useDeletePurchaseOrder();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [emailPo, setEmailPo] = useState<PurchaseOrderRow | null>(null);
  const [convertPo, setConvertPo] = useState<PurchaseOrderRow | null>(null);

  const orders = data?.purchaseOrders ?? [];
  const total = data?.total ?? 0;

  const visibleCount = useMemo(
    () => Object.values(columns).filter(Boolean).length,
    [columns],
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openConvertConfirm = (po: PurchaseOrderRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConvertPo(po);
  };

  const confirmConvert = () => {
    if (!convertPo) return;
    convertMutation.mutate(convertPo.id, {
      onSuccess: () => setConvertPo(null),
    });
  };

  const handleDelete = (po: PurchaseOrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete purchase order ${po.documentNumber}?`)) return;
    deleteMutation.mutate(po.id);
  };

  const openSendEmail = (po: PurchaseOrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmailPo(po);
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-zinc-500 whitespace-nowrap border-b border-zinc-200 bg-zinc-50/90";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Purchase Orders</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {total > 0 && (
              <span>
                Showing 1 to {total} of {total} Purchase Orders
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Columns3 className="size-3.5" />
                  Show/Hide Columns
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {(Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={columns[key]}
                    onCheckedChange={() => toggleColumn(key)}
                  >
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
              <Loader2 className="size-5 animate-spin" />
              Loading purchase orders…
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-red-500">
              Failed to load purchase orders.
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
              <FileText className="size-10 text-zinc-300" />
              <p className="text-sm">No purchase orders yet</p>
              <p className="max-w-sm text-center text-xs text-zinc-400">
                Accept a quotation and click &quot;Add As Purchase Order&quot; to create one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>#</th>
                    {columns.date && (
                      <th className={thClass}>
                        <span className="inline-flex items-center gap-1">
                          Date <ArrowUpDown className="size-3 opacity-40" />
                        </span>
                      </th>
                    )}
                    {columns.expand && <th className={`${thClass} w-12`} />}
                    {columns.poNumber && <th className={thClass}>Purchase Order</th>}
                    {columns.vendor && <th className={thClass}>Vendor</th>}
                    {columns.amount && <th className={`${thClass} text-right`}>Amount</th>}
                    {columns.status && <th className={thClass}>Status</th>}
                    {columns.paymentDate && <th className={thClass}>Payment Date</th>}
                    {columns.convertPo && <th className={thClass}>Convert PO</th>}
                    {columns.acceptance && <th className={thClass}>Acceptance Status</th>}
                    {columns.emailVendor && <th className={thClass}>Email Vendor</th>}
                    {columns.subTotal && <th className={`${thClass} text-right`}>Sub Total</th>}
                    {columns.amountInr && (
                      <th className={`${thClass} text-right`}>Purchase Order Amount in INR</th>
                    )}
                    {columns.tags && <th className={thClass}>Tags</th>}
                    {columns.workflowName && <th className={thClass}>Workflow Name</th>}
                    {columns.assignee && <th className={thClass}>Current Assignee</th>}
                    {columns.stage && <th className={thClass}>Current Stage</th>}
                    {columns.currentStatus && <th className={thClass}>Current Status</th>}
                    {columns.actions && <th className={`${thClass} w-36`}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((po, index) => {
                    const isOpen = expanded.has(po.id);
                    const badge = poStatusBadge(po);
                    const colSpan =
                      1 +
                      (columns.date ? 1 : 0) +
                      (columns.expand ? 1 : 0) +
                      (columns.poNumber ? 1 : 0) +
                      (columns.vendor ? 1 : 0) +
                      (columns.amount ? 1 : 0) +
                      (columns.status ? 1 : 0) +
                      (columns.paymentDate ? 1 : 0) +
                      (columns.convertPo ? 1 : 0) +
                      (columns.acceptance ? 1 : 0) +
                      (columns.emailVendor ? 1 : 0) +
                      (columns.subTotal ? 1 : 0) +
                      (columns.amountInr ? 1 : 0) +
                      (columns.tags ? 1 : 0) +
                      (columns.workflowName ? 1 : 0) +
                      (columns.assignee ? 1 : 0) +
                      (columns.stage ? 1 : 0) +
                      (columns.currentStatus ? 1 : 0) +
                      (columns.actions ? 1 : 0);

                    return (
                      <Fragment key={po.id}>
                        <tr
                          className="bg-white hover:bg-zinc-50/80 cursor-pointer"
                          onClick={() =>
                            router.push(`/sales-and-invoices/documents/${po.id}`)
                          }
                        >
                          <td className="px-3 py-2.5 text-xs text-zinc-500">{index + 1}</td>
                          {columns.date && (
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">
                              {fmt(po.documentDate)}
                            </td>
                          )}
                          {columns.expand && (
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleExpand(po.id)}
                                className="flex size-6 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-50"
                              >
                                {isOpen ? "−" : "+"}
                              </button>
                            </td>
                          )}
                          {columns.poNumber && (
                            <td className="px-3 py-2.5 font-medium text-zinc-900">
                              {po.documentNumber}
                            </td>
                          )}
                          {columns.vendor && (
                            <td className="px-3 py-2.5 text-zinc-700">{po.vendorName || "—"}</td>
                          )}
                          {columns.amount && (
                            <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                              {formatCurrency(po.totalAmount, po.currency)}
                            </td>
                          )}
                          {columns.status && (
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                          )}
                          {columns.paymentDate && (
                            <td className="px-3 py-2.5 text-zinc-400">—</td>
                          )}
                          {columns.convertPo && (
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              {po.isConvertedToPurchase ? (
                                <span className="inline-flex size-7 items-center justify-center text-emerald-600">
                                  <Check className="size-4" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => openConvertConfirm(po, e)}
                                  disabled={convertMutation.isPending}
                                  className="rounded-md border border-[#7438dc] px-3 py-1 text-xs font-semibold text-[#7438dc] hover:bg-purple-50 disabled:opacity-50"
                                >
                                  Convert to Purchase
                                </button>
                              )}
                            </td>
                          )}
                          {columns.acceptance && (
                            <td className="px-3 py-2.5">
                              {po.acceptanceStatus === "ACCEPTED" ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  Accepted
                                </span>
                              ) : po.acceptanceStatus === "PENDING" ? (
                                <span className="text-xs text-zinc-400">Pending</span>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </td>
                          )}
                          {columns.emailVendor && (
                            <td
                              className="px-3 py-2.5 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {po.emailSent ? (
                                <span className="text-zinc-500">Sent</span>
                              ) : (
                                <span className="text-zinc-500">
                                  Not Sent{" "}
                                  <button
                                    type="button"
                                    onClick={(e) => openSendEmail(po, e)}
                                    className="font-semibold text-[#7438dc] hover:underline"
                                  >
                                    [Send]
                                  </button>
                                </span>
                              )}
                            </td>
                          )}
                          {columns.subTotal && (
                            <td className="px-3 py-2.5 text-right text-zinc-700 whitespace-nowrap">
                              {formatCurrency(po.subTotal, po.currency)}
                            </td>
                          )}
                          {columns.amountInr && (
                            <td className="px-3 py-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                              {formatCurrency(po.totalAmount, po.currency)}
                            </td>
                          )}
                          {columns.tags && (
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="rounded border border-purple-200 px-2 py-0.5 text-xs text-[#7438dc] hover:bg-purple-50"
                              >
                                + Add Tags
                              </button>
                            </td>
                          )}
                          {columns.workflowName && (
                            <td className="px-3 py-2.5 text-zinc-300">—</td>
                          )}
                          {columns.assignee && (
                            <td className="px-3 py-2.5 text-zinc-300">—</td>
                          )}
                          {columns.stage && (
                            <td className="px-3 py-2.5 text-zinc-300">—</td>
                          )}
                          {columns.currentStatus && (
                            <td className="px-3 py-2.5">
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                {po.workflowStatus}
                              </span>
                            </td>
                          )}
                          {columns.actions && (
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="View"
                                  onClick={() =>
                                    router.push(`/sales-and-invoices/documents/${po.id}`)
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <Eye className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() =>
                                    router.push(`/sales-and-invoices/documents/${po.id}`)
                                  }
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={(e) => handleDelete(po, e)}
                                  disabled={po.isConvertedToPurchase || deleteMutation.isPending}
                                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                    >
                                      <MoreVertical className="size-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!po.isConvertedToPurchase && (
                                      <DropdownMenuItem
                                        onClick={() => openConvertConfirm(po)}
                                      >
                                        Convert to Purchase
                                      </DropdownMenuItem>
                                    )}
                                    {po.purchaseDocumentId && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/sales-and-invoices/documents/${po.purchaseDocumentId}`,
                                          )
                                        }
                                      >
                                        View Purchase ({po.purchaseDocumentNumber})
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setEmailPo(po)}>
                                      Email Vendor
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          )}
                        </tr>

                        {isOpen && columns.expand && (
                          <tr className="bg-zinc-50/60">
                            <td colSpan={colSpan} className="px-4 py-3">
                              <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50">
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                        Item Name
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                        Hsn/Sac
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                                        Sku ID
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                        Tax Rate
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                        Rate
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                        Sub Total
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
                                        Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-50">
                                    {po.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="px-3 py-2 text-zinc-800">{item.name}</td>
                                        <td className="px-3 py-2 text-zinc-600">
                                          {item.hsnSac ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-600">
                                          {item.sku ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right text-zinc-600">
                                          {item.taxRate}
                                        </td>
                                        <td className="px-3 py-2 text-right text-zinc-600">
                                          {item.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-right text-zinc-600">
                                          {item.rate}
                                        </td>
                                        <td className="px-3 py-2 text-right text-zinc-800">
                                          {item.amount}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-zinc-900">
                                          {item.total}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing 1 to {total} of {total} Purchase Orders
            </span>
            <span className="text-zinc-400">{visibleCount} columns visible</span>
          </div>
        )}
      </div>

      <Modal
        open={convertPo !== null}
        onClose={() => setConvertPo(null)}
        title="Convert to Purchase"
        description={
          convertPo
            ? `Convert purchase order ${convertPo.documentNumber} into a purchase record? This will create a purchase bill for ${formatCurrency(convertPo.totalAmount, convertPo.currency)}.`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setConvertPo(null)}
              className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmConvert}
              disabled={convertMutation.isPending}
              className="rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
            >
              {convertMutation.isPending ? "Converting…" : "Convert to Purchase"}
            </button>
          </>
        }
      >
        {convertPo && (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>
              <span className="font-medium text-zinc-800">Vendor:</span>{" "}
              {convertPo.vendorName}
            </p>
            <p>
              <span className="font-medium text-zinc-800">PO Number:</span>{" "}
              {convertPo.documentNumber}
            </p>
            <p>
              <span className="font-medium text-zinc-800">Amount:</span>{" "}
              {formatCurrency(convertPo.totalAmount, convertPo.currency)}
            </p>
          </div>
        )}
      </Modal>

      {emailPo && (
        <EmailPurchaseOrderSheet
          open={emailPo !== null}
          onOpenChange={(open) => {
            if (!open) setEmailPo(null);
          }}
          purchaseOrder={emailPo}
        />
      )}
    </div>
  );
}
