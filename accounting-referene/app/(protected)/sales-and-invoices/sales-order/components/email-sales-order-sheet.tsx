"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, CheckCircle2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { documentSendSchema, type DocumentSendInput } from "@/lib/validations/document";
import type { SalesOrderRow } from "@/lib/hooks/use-sales-orders";

type EmailSalesOrderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: SalesOrderRow;
};

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDefaultMessage(so: SalesOrderRow, businessName: string): string {
  return `Hi ${so.clientName},

Further to our discussion, please find the Sales Order attached.

Sales Order No: #${so.documentNumber}
Sales Order Date: ${fmt(so.documentDate)}
Sales Order For: ${so.clientName}

Looking forward to doing good business with you.

${businessName}`;
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

  const removeEmail = (email: string) => {
    onChange(value.filter((e) => e !== email));
  };

  return (
    <div className="min-h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 transition-colors focus-within:border-[#7438dc] focus-within:ring-2 focus-within:ring-[#7438dc]/20">
      <div className="flex flex-wrap gap-1">
        {value.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
          >
            {email}
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label={`Remove ${email}`}
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
          placeholder={value.length === 0 ? "Select..." : ""}
          className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function EmailSalesOrderSheet({
  open,
  onOpenChange,
  salesOrder,
}: EmailSalesOrderSheetProps) {
  const qc = useQueryClient();
  const so = salesOrder;
  const businessName = so.fromName ?? "";

  const defaultSubject = `[Important] Email Sales Order For ${so.clientName}`;
  const defaultMessage = buildDefaultMessage(so, businessName);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<DocumentSendInput>({
    resolver: zodResolver(documentSendSchema) as Resolver<DocumentSendInput>,
    defaultValues: {
      to: so.clientEmail ?? so.client?.email ?? "",
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
        to: so.clientEmail ?? so.client?.email ?? "",
        cc: [],
        replyTo: "",
        subject: defaultSubject,
        message: buildDefaultMessage(so, businessName),
        textType: "rich",
        getEmailStatus: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, so.id]);

  const getEmailStatus = watch("getEmailStatus");
  const toValue = watch("to");

  const sendMutation = useMutation({
    mutationFn: async (data: DocumentSendInput) => {
      const res = await fetch(`/api/documents/${so.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof body.error === "string" ? body.error : "Failed to send email";
        throw new Error(err);
      }
      return body as { success: boolean; emailSent: boolean };
    },
    onSuccess: (body) => {
      toast.success(
        body.emailSent
          ? "Sales order emailed successfully!"
          : "Sales order saved (email delivery unavailable)",
      );
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-zinc-100 px-6 py-4">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            Email Sales Order
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((data) => sendMutation.mutate(data))}
          className="divide-y divide-zinc-100"
        >
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Client Email</label>
            <div>
              <Input
                {...register("to")}
                placeholder="Client email address"
                className={errors.to ? "border-red-400" : ""}
              />
              {errors.to && (
                <p className="mt-1 text-xs text-red-500">{errors.to.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3 px-6 py-3">
            <label className="text-sm font-medium text-zinc-700">Client Name</label>
            <Input readOnly value={so.clientName} className="bg-zinc-50 text-zinc-600" />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <div className="flex items-center gap-1 pt-2">
              <label className="text-sm font-medium text-zinc-700">Reply To</label>
              <span className="text-xs text-orange-500">◆</span>
            </div>
            <Input {...register("replyTo")} placeholder="Select..." />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <div className="pt-2">
              <label className="block text-sm font-medium text-zinc-700">Also Send To</label>
              <span className="text-xs text-zinc-400">CC Emails</span>
            </div>
            <Controller
              name="cc"
              control={control}
              render={({ field }) => (
                <CcEmailInput value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Email Subject</label>
            <div>
              <Input {...register("subject")} className={errors.subject ? "border-red-400" : ""} />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
              )}
            </div>
          </div>

          <div className="px-6 py-3">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Message</label>
            <Textarea
              {...register("message")}
              rows={12}
              className={`font-mono text-xs ${errors.message ? "border-red-400" : ""}`}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2 bg-zinc-50 px-6 py-3">
            <Paperclip className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <p className="text-xs text-zinc-500">
              Sales order online link will be added to the email automatically.
            </p>
          </div>

          <div className="px-6 py-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Controller
                name="getEmailStatus"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="size-4 cursor-pointer accent-[#7438dc]"
                  />
                )}
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                <CheckCircle2 className="size-4 text-[#7438dc]" />
                Get Email Status
              </span>
            </label>
            {getEmailStatus && toValue && (
              <div className="mt-2 pl-6">
                <p className="text-xs text-zinc-500">Email receipt will be sent to</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700">
                  {toValue}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 px-6 py-4">
            <Button
              type="submit"
              disabled={sendMutation.isPending}
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
            >
              {sendMutation.isPending ? "Sending…" : "Send Email"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
