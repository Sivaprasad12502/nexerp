"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Paperclip } from "lucide-react";

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
import { formatCurrency } from "@/lib/document-adapter";
import type { DebitNoteRow } from "@/lib/hooks/use-debit-notes";

type EmailDebitNoteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debitNote: DebitNoteRow;
};

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDefaultMessage(debitNote: DebitNoteRow): string {
  const amount = formatCurrency(debitNote.debitIssued, debitNote.currency);
  return `Hi ${debitNote.issuedTo},

Please find the debit note attached.

Debit Note Date: ${fmt(debitNote.documentDate)}
Debit Note No: ${debitNote.documentNumber ? `#${debitNote.documentNumber}` : "Draft"}
Debit Issued: ${amount}
Issued To: ${debitNote.issuedTo}
${debitNote.debitReason ? `Reason: ${debitNote.debitReason}` : ""}

Regards,
${debitNote.fromName ?? ""}`;
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
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700"
          >
            {email}
            <button
              type="button"
              onClick={() => onChange(value.filter((e) => e !== email))}
              className="text-zinc-400 hover:text-zinc-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addEmail();
            }
          }}
          placeholder="Add CC email and press Enter"
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function EmailDebitNoteSheet({
  open,
  onOpenChange,
  debitNote,
}: EmailDebitNoteSheetProps) {
  const qc = useQueryClient();
  const defaultSubject = `[Important] Debit Note For ${debitNote.issuedTo}`;

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
      to: debitNote.clientEmail ?? "",
      cc: [],
      replyTo: "",
      subject: defaultSubject,
      message: buildDefaultMessage(debitNote),
      textType: "rich",
      getEmailStatus: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        to: debitNote.clientEmail ?? "",
        cc: [],
        replyTo: "",
        subject: defaultSubject,
        message: buildDefaultMessage(debitNote),
        textType: "rich",
        getEmailStatus: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debitNote.id]);

  const getEmailStatus = watch("getEmailStatus");
  const toValue = watch("to");

  const sendMutation = useMutation({
    mutationFn: async (data: DocumentSendInput) => {
      const res = await fetch(`/api/documents/${debitNote.id}/send`, {
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
          ? "Debit note emailed successfully!"
          : "Debit note saved (email delivery unavailable)",
      );
      qc.invalidateQueries({ queryKey: ["debit-notes"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
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
            Email Debit Note
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
            <Input readOnly value={debitNote.issuedTo} className="bg-zinc-50 text-zinc-600" />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Reply To</label>
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
              Debit note view link will be added to the email automatically.
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
