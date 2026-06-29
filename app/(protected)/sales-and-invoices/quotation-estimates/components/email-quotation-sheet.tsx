"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  X,
  Plus,
  Info,
  CheckCircle2,
  ChevronDown,
  Bell,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { quotationSendSchema, type QuotationSendInput } from "@/lib/validations/quotation";
import { type QuotationRow } from "./quotation-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailQuotationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationRow;
  quotationId: string;
  clientEmail?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDefaultMessage(q: QuotationRow): string {
  return `Hi ${q.clientName ?? ""},

Please find attached quotation #${q.quotationNumber}. The Quotation Valid Till Date is ${fmt(q.validTillDate)}.

Quotation No: #${q.quotationNumber}
Quotation Date: ${fmt(q.quotationDate)}
Quotation For: ${q.clientName ?? ""}
Valid Till Date: ${fmt(q.validTillDate)}
Total Amount: ${q.currency} ${q.totalAmount}

Looking forward to working with you

Regards,
${q.fromName ?? ""}`;
}

// ─── CC email chip input ───────────────────────────────────────────────────────

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
    <div className="min-h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 focus-within:border-[#7438dc] focus-within:ring-2 focus-within:ring-[#7438dc]/20 transition-colors">
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
          placeholder={value.length === 0 ? "Add email, press Enter" : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none py-0.5"
        />
      </div>
    </div>
  );
}

// ─── Sheet component ───────────────────────────────────────────────────────────

export function EmailQuotationSheet({
  open,
  onOpenChange,
  quotation,
  quotationId,
  clientEmail,
}: EmailQuotationSheetProps) {
  const qc = useQueryClient();
  const smtpConfigured = Boolean(process.env.NEXT_PUBLIC_SMTP_CONFIGURED !== "false");

  const defaultMessage = buildDefaultMessage(quotation);
  const defaultSubject = `[Important] Email Quotation For ${quotation.clientName ?? ""} - #${quotation.quotationNumber}`;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuotationSendInput>({
    resolver: zodResolver(quotationSendSchema) as Resolver<QuotationSendInput>,
    defaultValues: {
      to: clientEmail ?? "",
      cc: [],
      replyTo: "",
      subject: defaultSubject,
      message: defaultMessage,
      textType: "rich",
      getEmailStatus: true,
    },
  });

  // Reset when sheet opens with new data
  useEffect(() => {
    if (open) {
      reset({
        to: clientEmail ?? "",
        cc: [],
        replyTo: "",
        subject: defaultSubject,
        message: defaultMessage,
        textType: "rich",
        getEmailStatus: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quotationId]);

  const textType = watch("textType");
  const getEmailStatus = watch("getEmailStatus");
  const ccValue = watch("cc");
  const toValue = watch("to");

  const sendMutation = useMutation({
    mutationFn: async (data: QuotationSendInput) => {
      const res = await fetch(`/api/quotations/${quotationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to send email");
      return body as { approvalUrl: string; emailSent: boolean };
    },
    onSuccess: (body) => {
      toast.success(
        body.emailSent
          ? "Quotation emailed successfully!"
          : "Quotation sent (email delivery unavailable — link generated)",
      );
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["quotations", quotationId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (data: QuotationSendInput) => {
    sendMutation.mutate(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] overflow-y-auto p-0"
      >
        <SheetHeader className="border-b border-zinc-100 px-6 py-4">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            Email Quotation
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-zinc-100">
          {/* ── Senders Email ── */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-3 px-6 py-3">
            <label className="text-sm font-medium text-zinc-700">Senders Email</label>
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <Mail className="size-4 shrink-0 text-zinc-400" />
              <span className="flex-1 text-sm text-zinc-500">
                + Connect To Gmail
              </span>
              <ChevronDown className="size-4 text-zinc-400" />
            </div>
          </div>

          {/* ── Client Email ── */}
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

          {/* ── Client Name ── */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-3 px-6 py-3">
            <label className="text-sm font-medium text-zinc-700">Client Name</label>
            <Input
              readOnly
              value={quotation.clientName ?? ""}
              className="bg-zinc-50 text-zinc-600"
            />
          </div>

          {/* ── Reply To ── */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <div className="flex items-center gap-1 pt-2">
              <label className="text-sm font-medium text-zinc-700">Reply To</label>
              <Info className="size-3.5 text-zinc-400" />
            </div>
            <div>
              <Input
                {...register("replyTo")}
                placeholder="Select..."
                className={errors.replyTo ? "border-red-400" : ""}
              />
            </div>
          </div>

          {/* ── Also Send To / CC ── */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <div className="pt-2">
              <label className="block text-sm font-medium text-zinc-700">Also Send To</label>
              <span className="text-xs text-zinc-400">CC Emails</span>
            </div>
            <div>
              <Controller
                name="cc"
                control={control}
                render={({ field }) => (
                  <CcEmailInput value={field.value} onChange={field.onChange} />
                )}
              />
              <button
                type="button"
                className="mt-1 text-xs font-medium text-[#7438dc] hover:underline"
              >
                Save CC for Client
              </button>
            </div>
          </div>

          {/* ── Email Subject ── */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 px-6 py-3">
            <label className="pt-2 text-sm font-medium text-zinc-700">Email Subject</label>
            <div>
              <Input
                {...register("subject")}
                className={errors.subject ? "border-red-400" : ""}
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
              )}
            </div>
          </div>

          {/* ── Message ── */}
          <div className="px-6 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700">Message</label>
              <button
                type="button"
                className="text-xs font-medium text-[#7438dc] hover:underline"
              >
                See Preview
              </button>
            </div>
            <Textarea
              {...register("message")}
              rows={12}
              className={`font-mono text-xs ${errors.message ? "border-red-400" : ""}`}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
            )}
          </div>

          {/* ── Info notice ── */}
          <div className="flex items-start gap-2 bg-zinc-50 px-6 py-3">
            <Info className="mt-0.5 size-4 shrink-0 text-zinc-400" />
            <p className="text-xs text-zinc-500">
              Quotation PDF attachment and online Link will be added to the email automatically.
            </p>
          </div>

          {/* ── Get Email Status ── */}
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

            {getEmailStatus && (
              <div className="mt-2 pl-6">
                <p className="text-xs text-zinc-500">Email receipt will be sent to</p>
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Recipients
                  </label>
                  {toValue && (
                    <div className="flex flex-wrap gap-1">
                      <span className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700">
                        {toValue}
                        <X className="size-3 text-zinc-400" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Text type ── */}
          <div className="px-6 py-3">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Select text type
            </label>
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <Controller
                  name="textType"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="radio"
                      value="rich"
                      checked={field.value === "rich"}
                      onChange={() => field.onChange("rich")}
                      className="accent-[#7438dc]"
                    />
                  )}
                />
                Rich Text
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <Controller
                  name="textType"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="radio"
                      value="plain"
                      checked={field.value === "plain"}
                      onChange={() => field.onChange("plain")}
                      className="accent-[#7438dc]"
                    />
                  )}
                />
                Plain Text
              </label>
            </div>
          </div>

          {/* ── Auto Reminders ── */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-zinc-400" />
              <span className="text-sm text-zinc-700">Setup Auto Reminders</span>
            </div>
            {/* Toggle (UI only for Phase 1) */}
            <button
              type="button"
              className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-200 transition-colors focus:outline-none"
              aria-label="Toggle auto reminders"
            >
              <span className="inline-block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform" />
            </button>
          </div>

          {/* ── Email verify banner ── */}
          <div className="bg-amber-50 px-6 py-3">
            <p className="text-xs text-amber-700">
              To resume sending emails from Refrens, you must verify your email.{" "}
              <button type="button" className="font-medium text-[#7438dc] hover:underline">
                verify your email →
              </button>
            </p>
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center gap-3 px-6 py-4">
            <Button
              type="submit"
              disabled={sendMutation.isPending}
              className="bg-[#7438dc] text-white hover:bg-[#6330c2]"
            >
              {sendMutation.isPending ? "Sending…" : "Send Email"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled
              title="Coming soon"
            >
              Schedule for later
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
