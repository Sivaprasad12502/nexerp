"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  payoutReceiptSendSchema,
  type PayoutReceiptSendInput,
} from "@/lib/validations/payout-receipt";
import type { PayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import { formatReceiptAmount } from "@/lib/payment-receipt-format";

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildDefaultMessage(receipt: PayoutReceiptRow): string {
  const amount = formatReceiptAmount(receipt.totalAmount, {
    currency: receipt.currency,
    numberFormat: receipt.numberFormat,
    decimalDigits: receipt.decimalDigits,
    customCurrencySymbol: receipt.customCurrencySymbol,
  });

  return `Hi ${receipt.vendorName ?? ""},

Please find your Payout Receipt details below.

Payout Receipt No: ${receipt.receiptNumber}
Receipt Date: ${fmt(receipt.receiptDate)}
Amount Received: ${amount}

Please find your payout receipt details below.

Regards,
${receipt.businessName ?? ""}`;
}

function CcEmailInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  const addEmail = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setInputVal("");
  };

  return (
    <div className="min-h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 focus-within:border-[#7438dc] focus-within:ring-2 focus-within:ring-[#7438dc]/20">
      <div className="flex flex-wrap gap-1">
        {value.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
          >
            {email}
            <button
              type="button"
              onClick={() => onChange(value.filter((e) => e !== email))}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addEmail();
            }
          }}
          onBlur={addEmail}
          placeholder={value.length === 0 ? "Add email, press Enter" : ""}
          className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function EmailPayoutReceiptSheet({
  open,
  onOpenChange,
  receipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: PayoutReceiptRow;
}) {
  const qc = useQueryClient();
  const defaultMessage = buildDefaultMessage(receipt);
  const defaultSubject = `Payout Receipt ${receipt.receiptNumber} from ${receipt.businessName ?? "us"}`;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PayoutReceiptSendInput>({
    resolver: zodResolver(payoutReceiptSendSchema) as Resolver<PayoutReceiptSendInput>,
    defaultValues: {
      to: receipt.vendorEmail ?? "",
      cc: [],
      replyTo: "",
      subject: defaultSubject,
      message: defaultMessage,
      textType: "rich",
      getEmailStatus: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        to: receipt.vendorEmail ?? "",
        cc: [],
        replyTo: "",
        subject: defaultSubject,
        message: defaultMessage,
        textType: "rich",
        getEmailStatus: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, receipt.id]);

  const sendMutation = useMutation({
    mutationFn: async (data: PayoutReceiptSendInput) => {
      const res = await fetch(`/api/payout-receipts/${receipt.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to send email");
      }
      return body as { success: boolean; emailSent: boolean };
    },
    onSuccess: (body) => {
      toast.success(
        body.emailSent
          ? "Payout receipt emailed successfully!"
          : "Payout receipt saved (email delivery unavailable)",
      );
      qc.invalidateQueries({ queryKey: ["payout-receipts"] });
      qc.invalidateQueries({ queryKey: ["payout-receipts", receipt.id] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-zinc-100 px-6 py-4">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            Email Payout Receipt
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((data) => sendMutation.mutate(data))}
          className="divide-y divide-zinc-100"
        >
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Vendor Email</label>
            <div>
              <Input
                {...register("to")}
                placeholder="Vendor email address"
                className={errors.to ? "border-red-400" : ""}
              />
              {errors.to && (
                <p className="mt-1 text-xs text-red-500">{errors.to.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3 px-6 py-3">
            <label className="text-sm font-medium text-zinc-700">Vendor Name</label>
            <Input value={receipt.vendorName ?? ""} readOnly className="bg-zinc-50" />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">CC</label>
            <Controller
              control={control}
              name="cc"
              render={({ field }) => (
                <CcEmailInput value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Subject</label>
            <div>
              <Input {...register("subject")} />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Message</label>
            <div>
              <Textarea {...register("message")} rows={12} className="resize-none" />
              {errors.message && (
                <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
