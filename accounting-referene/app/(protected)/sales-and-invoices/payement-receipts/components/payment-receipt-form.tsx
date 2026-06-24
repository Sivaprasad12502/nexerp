"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Lightbulb, Loader2, Plus } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import {
  NumberCurrencyFormatModal,
  type NumberCurrencyFormat,
} from "@/components/shared/number-currency-format-modal";
import { ClientForm } from "../../clients-prospects/components/client-form";
import { AddPaymentRecordModal } from "./add-payment-record-modal";
import {
  RecordNewPaymentModal,
  type ReceiptRecordType,
} from "./record-new-payment-modal";
import {
  PaymentReceiptStep3Extras,
  UnpaidInvoicesEmptyState,
  type PaymentReceiptExtras,
} from "./payment-receipt-step3-extras";
import {
  METHOD_LABELS,
  parseLineTags,
} from "@/components/shared/payment-form-fields";
import type { PaymentAccount } from "@/app/(protected)/sales-and-invoices/documents/components/add-payment-account-modal";
import {
  useCreatePaymentReceipt,
  useUnpaidInvoices,
  fetchNextReceiptNumber,
  type PaymentReceiptRow,
} from "@/lib/hooks/use-payment-receipts";
import { formatReceiptAmount } from "@/lib/payment-receipt-format";
import type {
  PaymentReceiptAllocationInput,
  PaymentReceiptCreateInput,
  PaymentReceiptLineInput,
} from "@/lib/validations/payment-receipt";

const CURRENCIES = ["INR", "AED", "USD", "EUR", "GBP", "GTQ"];

type Props = {
  initialData?: PaymentReceiptRow | null;
  initialReceiptType?: ReceiptRecordType;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
  onCreateNew?: () => void;
};

const EMPTY_EXTRAS: PaymentReceiptExtras = {
  notes: "",
  contactDetails: "",
  additionalInfo: "",
  signature: "",
  attachments: [],
};

const inputCls =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#7438dc] focus:ring-2 focus:ring-[#7438dc]/20";

export function PaymentReceiptForm({
  initialData,
  initialReceiptType,
  onCancel,
  onSaved,
  onCreateNew,
}: Props) {
  const qc = useQueryClient();
  const createMutation = useCreatePaymentReceipt();
  const isEdit = Boolean(initialData?.id);

  const [receiptType, setReceiptType] = useState<ReceiptRecordType | null>(
    initialReceiptType ?? null,
  );
  const [typeModalOpen, setTypeModalOpen] = useState(!isEdit && !initialReceiptType);
  const isClientAdvance = receiptType === "CLIENT_ADVANCE";

  const [step, setStep] = useState(1);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState("INR");
  const [format, setFormat] = useState<NumberCurrencyFormat>({
    numberFormat: "en-IN",
    decimalDigits: 2,
    customCurrencySymbol: "",
  });
  const [lines, setLines] = useState<PaymentReceiptLineInput[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, number>>({});
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [extras, setExtras] = useState<PaymentReceiptExtras>(EMPTY_EXTRAS);

  const { data: clientsData } = useQuery<{
    clients: { id: string; businessName: string }[];
  }>({
    queryKey: ["clients", "ACTIVE"],
    queryFn: () => fetch("/api/clients?status=ACTIVE").then((r) => r.json()),
  });

  const { data: accountsData } = useQuery<{ accounts: PaymentAccount[] }>({
    queryKey: ["payment-accounts"],
    queryFn: () => fetch("/api/payment-accounts").then((r) => r.json()),
    enabled: step >= 2,
  });

  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidInvoices(
    step >= 3 && !isClientAdvance ? clientId : null,
  );

  useEffect(() => {
    if (initialData) {
      setReceiptType(initialData.type);
      setReceiptNumber(initialData.receiptNumber);
      setClientId(initialData.clientId ?? "");
      setReceiptDate(initialData.receiptDate.slice(0, 10));
      setCurrency(initialData.currency);
      setFormat({
        numberFormat: initialData.numberFormat,
        decimalDigits: initialData.decimalDigits,
        customCurrencySymbol: initialData.customCurrencySymbol ?? "",
      });
      setLines(
        initialData.lines.map((l) => ({
          paymentAccountId: l.paymentAccountId,
          method: l.method,
          refId: l.refId,
          amountReceived: l.amountReceived,
          amountInBaseCurrency: l.amountInBaseCurrency,
          transactionCharge: l.transactionCharge,
          tags: l.tags,
          sortOrder: l.sortOrder,
        })),
      );
      setExtras({
        notes: initialData.notes ?? "",
        contactDetails: initialData.contactDetails ?? "",
        additionalInfo: initialData.additionalInfo ?? "",
        signature: initialData.signature ?? "",
        attachments: initialData.attachments ?? [],
      });
      return;
    }
    fetchNextReceiptNumber().then(setReceiptNumber).catch(() => setReceiptNumber("A00001"));
  }, [initialData]);

  useEffect(() => {
    if (initialReceiptType && !isEdit) {
      setReceiptType(initialReceiptType);
      setTypeModalOpen(false);
    }
  }, [initialReceiptType, isEdit]);

  const clients = clientsData?.clients ?? [];
  const paymentAccounts = accountsData?.accounts ?? [];
  const accountNameById = useMemo(
    () => new Map(paymentAccounts.map((a) => [a.id, a.displayName])),
    [paymentAccounts],
  );
  const unpaidInvoices = unpaidData?.invoices ?? [];
  const totalReceived = lines.reduce((s, l) => s + l.amountReceived, 0);

  const formatOpts = useMemo(
    () => ({
      currency,
      numberFormat: format.numberFormat,
      decimalDigits: format.decimalDigits,
      customCurrencySymbol: format.customCurrencySymbol || null,
    }),
    [currency, format],
  );

  const allocations: PaymentReceiptAllocationInput[] = Object.entries(selectedInvoices)
    .filter(([, amt]) => amt > 0)
    .map(([documentId, amountAllocated]) => ({ documentId, amountAllocated }));

  const canContinueStep1 = receiptNumber.trim() && clientId && receiptDate && currency;
  const canContinueStep2 = lines.length > 0;

  const handleSaveLine = (line: PaymentReceiptLineInput) => {
    if (editingLineIdx !== null) {
      setLines((prev) => prev.map((l, i) => (i === editingLineIdx ? line : l)));
      setEditingLineIdx(null);
    } else {
      setLines((prev) => [...prev, line]);
    }
  };

  const buildPayload = (saveAsDraft: boolean): PaymentReceiptCreateInput => ({
    receiptNumber,
    type: receiptType ?? "PAYMENT_RECEIPT",
    clientId,
    receiptDate,
    currency,
    numberFormat: format.numberFormat,
    decimalDigits: format.decimalDigits,
    customCurrencySymbol: format.customCurrencySymbol || null,
    lines,
    allocations: isClientAdvance ? [] : allocations,
    notes: extras.notes || null,
    signature: extras.signature || null,
    additionalInfo: extras.additionalInfo || null,
    contactDetails: extras.contactDetails || null,
    attachments: extras.attachments,
    saveAsDraft,
  });

  const resetForNew = async () => {
    setStep(1);
    setLines([]);
    setSelectedInvoices({});
    setExtras(EMPTY_EXTRAS);
    setEditingLineIdx(null);
    setReceiptType(null);
    setTypeModalOpen(true);
    try {
      const next = await fetchNextReceiptNumber();
      setReceiptNumber(next);
    } catch {
      setReceiptNumber("A00001");
    }
  };

  const handleSubmit = async (mode: "continue" | "createNew" | "draft") => {
    if (!canContinueStep1 || !canContinueStep2) return;
    const saveAsDraft = mode === "draft";
    const result = await createMutation.mutateAsync(buildPayload(saveAsDraft));

    if (mode === "continue") {
      onSaved?.(result.paymentReceipt.id);
      return;
    }
    if (mode === "createNew") {
      await resetForNew();
      onCreateNew?.();
      return;
    }
    await resetForNew();
  };

  const toggleInvoice = (id: string, total: number, checked: boolean) => {
    setSelectedInvoices((prev) => {
      const next = { ...prev };
      if (checked) next[id] = total;
      else delete next[id];
      return next;
    });
  };

  const handleTypeSelect = (type: ReceiptRecordType) => {
    setReceiptType(type);
    setTypeModalOpen(false);
  };

  const saveFooter = (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={createMutation.isPending || isEdit}
        onClick={() => handleSubmit("continue")}
        className="inline-flex items-center gap-2 rounded-md bg-[#e91e8c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d0187d] disabled:opacity-50"
      >
        {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Save &amp; Continue
      </button>
      <button
        type="button"
        disabled={createMutation.isPending || isEdit}
        onClick={() => handleSubmit("createNew")}
        className="inline-flex items-center gap-2 rounded-md border border-[#e91e8c] px-5 py-2.5 text-sm font-semibold text-[#e91e8c] hover:bg-pink-50 disabled:opacity-50"
      >
        Save &amp; Create New
      </button>
      <button
        type="button"
        disabled={createMutation.isPending || isEdit}
        onClick={() => handleSubmit("draft")}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        Save as draft
      </button>
    </div>
  );

  return (
    <>
      <RecordNewPaymentModal
        open={typeModalOpen}
        onClose={() => onCancel?.()}
        onSelect={handleTypeSelect}
      />

      {(receiptType || isEdit) && (
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Step 1 */}
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <StepHeader
            n={1}
            title="Select Client"
            open={step === 1}
            onToggle={() => setStep(1)}
          />
          {step === 1 && (
            <div className="space-y-4 border-t border-zinc-100 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Payment Receipt No" required>
                  <input
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Payment Received From" required>
                  <div className="flex gap-2">
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setClientModalOpen(true)}
                      className="shrink-0 rounded-md border border-[#7438dc] px-3 text-sm font-medium text-[#7438dc] hover:bg-violet-50"
                    >
                      + Add New
                    </button>
                  </div>
                </Field>
                <Field label="Receipt Date" required>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Currency" required>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputCls}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                type="button"
                onClick={() => setFormatModalOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <span className="text-lg">123</span>
                Number and Currency Format
              </button>
              <button
                type="button"
                disabled={!canContinueStep1}
                onClick={() => setStep(2)}
                className="rounded-md bg-[#7438dc] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
        </section>

        {/* Step 2 */}
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <StepHeader
            n={2}
            title="Add Payment Records"
            open={step === 2}
            onToggle={() => canContinueStep1 && setStep(2)}
            disabled={!canContinueStep1}
          />
          {step === 2 && (
            <div className="border-t border-zinc-100 p-6">
              <div className="relative min-h-[220px]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Deposited To</th>
                        <th className="px-3 py-2 text-left">Payment Method</th>
                        <th className="px-3 py-2 text-left">Ref. ID</th>
                        <th className="px-3 py-2 text-right">Amount Received</th>
                        <th className="px-3 py-2 text-right">Amount Received in INR</th>
                        <th className="px-3 py-2 text-right">Txn Charges</th>
                        <th className="px-3 py-2 text-left">Tags</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {lines.map((line, idx) => {
                        const parsed = parseLineTags(line.tags ?? []);
                        const tagLabels = [
                          ...parsed.displayTags,
                          ...(parsed.tdsWithheld > 0
                            ? [`TDS: ${parsed.tdsWithheld}`]
                            : []),
                        ];
                        const amountInInr =
                          currency === "INR"
                            ? line.amountReceived
                            : line.amountInBaseCurrency ?? line.amountReceived;

                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              {line.paymentAccountId
                                ? accountNameById.get(line.paymentAccountId) ?? "—"
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {METHOD_LABELS[line.method] ?? line.method.replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-2">{line.refId ?? "—"}</td>
                            <td className="px-3 py-2 text-right">
                              {formatReceiptAmount(line.amountReceived, formatOpts)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatReceiptAmount(amountInInr, {
                                ...formatOpts,
                                currency: "INR",
                              })}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatReceiptAmount(line.transactionCharge, formatOpts)}
                            </td>
                            <td className="px-3 py-2 text-zinc-600">
                              {tagLabels.length > 0 ? tagLabels.join(", ") : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatReceiptAmount(line.amountReceived, formatOpts)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                className="text-xs text-[#7438dc] hover:underline"
                                onClick={() => {
                                  setEditingLineIdx(idx);
                                  setLineModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-semibold">
                        <td colSpan={3} className="px-3 py-2">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatReceiptAmount(totalReceived, formatOpts)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatReceiptAmount(
                            lines.reduce(
                              (s, l) =>
                                s +
                                (currency === "INR"
                                  ? l.amountReceived
                                  : l.amountInBaseCurrency ?? l.amountReceived),
                              0,
                            ),
                            { ...formatOpts, currency: "INR" },
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatReceiptAmount(
                            lines.reduce((s, l) => s + l.transactionCharge, 0),
                            formatOpts,
                          )}
                        </td>
                        <td colSpan={1} />
                        <td className="px-3 py-2 text-right">
                          {formatReceiptAmount(totalReceived, formatOpts)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {lines.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="rounded-lg border border-zinc-200 bg-white px-10 py-8 text-center shadow-sm">
                      <p className="font-medium text-zinc-800">Record Payments</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Record multiple payments against multiple Invoices
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLineIdx(null);
                          setLineModalOpen(true);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#7438dc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6230c4]"
                      >
                        <Plus className="size-4" />
                        Add New Payment Record
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLineIdx(null);
                    setLineModalOpen(true);
                  }}
                  className="mt-3 text-sm font-medium text-[#7438dc] hover:underline"
                >
                  + Add New Payment Record
                </button>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canContinueStep2}
                  onClick={() => setStep(3)}
                  className="rounded-md bg-[#7438dc] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Step 3 */}
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <StepHeader
            n={3}
            title={isClientAdvance ? "Add Additional Details" : "Settle Unpaid Invoices"}
            open={step === 3}
            onToggle={() => canContinueStep2 && setStep(3)}
            disabled={!canContinueStep2}
          />
          {step === 3 && (
            <div className="border-t border-zinc-100 p-6">
              {isClientAdvance ? (
                <>
                  <PaymentReceiptStep3Extras
                    value={extras}
                    onChange={setExtras}
                    className="mt-0 space-y-3"
                  />
                  {saveFooter}
                </>
              ) : unpaidLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-[#7438dc]" />
                </div>
              ) : (
                <>
                  {unpaidInvoices.length === 0 ? (
                    <UnpaidInvoicesEmptyState clientId={clientId} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-zinc-500">
                          <tr>
                            <th className="w-10 px-3 py-2" />
                            <th className="px-3 py-2 text-left">Invoice</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-right">Amount Due</th>
                            <th className="px-3 py-2 text-right">Allocate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {unpaidInvoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  className="accent-[#7438dc]"
                                  checked={inv.id in selectedInvoices}
                                  onChange={(e) =>
                                    toggleInvoice(inv.id, inv.totalAmount, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 font-medium">{inv.documentNumber}</td>
                              <td className="px-3 py-2">
                                {new Date(inv.documentDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatReceiptAmount(inv.totalAmount, {
                                  ...formatOpts,
                                  currency: inv.currency,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {inv.id in selectedInvoices ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedInvoices[inv.id]}
                                    onChange={(e) =>
                                      setSelectedInvoices((prev) => ({
                                        ...prev,
                                        [inv.id]: parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-28 rounded border border-zinc-200 px-2 py-1 text-right text-sm"
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <PaymentReceiptStep3Extras value={extras} onChange={setExtras} />
                  {saveFooter}
                </>
              )}
            </div>
          )}
        </section>
      </div>
      )}

      <Modal open={clientModalOpen} onClose={() => setClientModalOpen(false)} title="Add New Client" size="xl">
        <ClientForm
          onCancel={() => setClientModalOpen(false)}
          onSaved={(id) => {
            setClientModalOpen(false);
            qc.invalidateQueries({ queryKey: ["clients"] });
            setClientId(id);
          }}
        />
      </Modal>

      <NumberCurrencyFormatModal
        open={formatModalOpen}
        onClose={() => setFormatModalOpen(false)}
        value={format}
        onSave={setFormat}
      />

      <AddPaymentRecordModal
        open={lineModalOpen}
        onClose={() => setLineModalOpen(false)}
        initial={editingLineIdx !== null ? lines[editingLineIdx] : null}
        receiptDate={receiptDate}
        currency={currency}
        onSave={handleSaveLine}
      />
    </>
  );
}

function StepHeader({
  n,
  title,
  open,
  onToggle,
  disabled,
}: {
  n: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="flex w-full items-center justify-between px-6 py-4 text-left disabled:opacity-50"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#7438dc] text-sm font-bold text-white">
          {n}
        </span>
        <span className="font-semibold text-zinc-900">{title}</span>
        <Lightbulb className="size-4 text-amber-400" />
      </span>
      {open ? <ChevronUp className="size-5 text-zinc-400" /> : <ChevronDown className="size-5 text-zinc-400" />}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
