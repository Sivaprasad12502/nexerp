"use client";

import { useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Pen,
  Phone,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { uploadFile } from "@/lib/upload";

export type PayoutReceiptExtras = {
  notes: string;
  contactDetails: string;
  additionalInfo: string;
  signature: string;
  attachments: string[];
};

type Props = {
  value: PayoutReceiptExtras;
  onChange: (value: PayoutReceiptExtras) => void;
  className?: string;
};

export function PayoutReceiptStep3Extras({ value, onChange, className }: Props) {
  const [openNotes, setOpenNotes] = useState(Boolean(value.notes));
  const [openContact, setOpenContact] = useState(Boolean(value.contactDetails));
  const [openAdditional, setOpenAdditional] = useState(Boolean(value.additionalInfo));
  const [openSignature, setOpenSignature] = useState(Boolean(value.signature));
  const [openAttachments, setOpenAttachments] = useState(value.attachments.length > 0);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  const signatureRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<PayoutReceiptExtras>) =>
    onChange({ ...value, ...partial });

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureUploading(true);
    try {
      const url = await uploadFile(file);
      patch({ signature: url });
      setOpenSignature(true);
      toast.success("Signature uploaded");
    } catch {
      toast.error("Signature upload failed");
    } finally {
      setSignatureUploading(false);
      e.target.value = "";
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachmentUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadFile));
      patch({ attachments: [...value.attachments, ...urls] });
      setOpenAttachments(true);
      toast.success(`${urls.length} attachment(s) added`);
    } catch {
      toast.error("Attachment upload failed");
    } finally {
      setAttachmentUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className={className ?? "mt-6 space-y-3"}>
      <ExtraSection
        icon={FileText}
        label="Add Notes"
        open={openNotes}
        onOpen={() => setOpenNotes(true)}
        onClose={() => {
          setOpenNotes(false);
          patch({ notes: "" });
        }}
      >
        <textarea
          rows={4}
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Additional notes…"
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
        />
      </ExtraSection>

      <ExtraSection
        icon={Phone}
        label="Add Contact Details"
        open={openContact}
        onOpen={() => setOpenContact(true)}
        onClose={() => {
          setOpenContact(false);
          patch({ contactDetails: "" });
        }}
      >
        <textarea
          rows={3}
          value={value.contactDetails}
          onChange={(e) => patch({ contactDetails: e.target.value })}
          placeholder="Contact details to show on receipt…"
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
        />
      </ExtraSection>

      <ExtraSection
        icon={FileText}
        label="Add Additional Info"
        open={openAdditional}
        onOpen={() => setOpenAdditional(true)}
        onClose={() => {
          setOpenAdditional(false);
          patch({ additionalInfo: "" });
        }}
      >
        <textarea
          rows={3}
          value={value.additionalInfo}
          onChange={(e) => patch({ additionalInfo: e.target.value })}
          placeholder="Any additional information…"
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#7438dc] resize-none"
        />
      </ExtraSection>

      <ExtraSection
        icon={Pen}
        label="Add Signature"
        open={openSignature}
        onOpen={() => setOpenSignature(true)}
        onClose={() => {
          setOpenSignature(false);
          patch({ signature: "" });
        }}
      >
        {value.signature ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.signature}
              alt="Signature"
              className="h-16 rounded-md border border-zinc-200 object-contain"
            />
            <button
              type="button"
              onClick={() => patch({ signature: "" })}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200"
            >
              <X className="size-3 text-zinc-500" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signatureRef.current?.click()}
            disabled={signatureUploading}
            className="flex h-16 w-full max-w-sm items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-200 text-sm text-zinc-400 hover:border-[#7438dc] hover:text-[#7438dc]"
          >
            {signatureUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Pen className="size-4" /> Upload signature
              </>
            )}
          </button>
        )}
        <input
          ref={signatureRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSignatureUpload}
        />
      </ExtraSection>

      <ExtraSection
        icon={Paperclip}
        label="Add Attachments"
        open={openAttachments}
        onOpen={() => setOpenAttachments(true)}
        onClose={() => {
          setOpenAttachments(false);
          patch({ attachments: [] });
        }}
      >
        {value.attachments.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {value.attachments.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                <FileText className="size-3.5 shrink-0 text-zinc-400" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-[#7438dc] hover:underline"
                >
                  {url.split("/").pop()}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      attachments: value.attachments.filter((_, j) => j !== i),
                    })
                  }
                  className="text-zinc-400 hover:text-red-500"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => attachmentRef.current?.click()}
          disabled={attachmentUploading}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-[#7438dc] hover:text-[#7438dc]"
        >
          {attachmentUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" /> Upload files
            </>
          )}
        </button>
        <input
          ref={attachmentRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachmentUpload}
        />
      </ExtraSection>
    </div>
  );
}

function ExtraSection({
  icon: Icon,
  label,
  open,
  onOpen,
  onClose,
  children,
}: {
  icon: typeof FileText;
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full max-w-xs items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-2.5 text-sm font-medium text-[#7438dc] hover:bg-zinc-50"
      >
        <Icon className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-xl rounded-lg border border-dashed border-zinc-300 bg-zinc-50/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <Icon className="size-4 text-[#7438dc]" />
          {label.replace(/^Add /, "")}
        </span>
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-red-500">
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function UnpaidExpendituresEmptyState({
  vendorId,
}: {
  vendorId: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/40 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex justify-center">
        <svg width="80" height="64" viewBox="0 0 80 64" fill="none" aria-hidden>
          <rect x="18" y="8" width="44" height="52" rx="4" fill="#E4E4E7" />
          <rect x="24" y="18" width="32" height="3" rx="1.5" fill="#A1A1AA" />
          <rect x="24" y="26" width="24" height="3" rx="1.5" fill="#D4D4D8" />
          <rect x="24" y="34" width="28" height="3" rx="1.5" fill="#D4D4D8" />
          <rect x="10" y="14" width="40" height="48" rx="4" fill="white" stroke="#D4D4D8" />
          <rect x="16" y="24" width="28" height="3" rx="1.5" fill="#E4E4E7" />
          <rect x="16" y="32" width="20" height="3" rx="1.5" fill="#F4F4F5" />
        </svg>
      </div>
      <p className="text-base font-semibold text-zinc-900">No unpaid Expenditures found</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        There are no unpaid expenditures against this vendor. This payment will be recorded as
        advance payment.
      </p>
      <a
        href={`/sales-and-invoices/vendors/${vendorId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[#7438dc] px-4 py-2 text-sm font-medium text-[#7438dc] hover:bg-violet-50"
      >
        See Vendor Statement
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
