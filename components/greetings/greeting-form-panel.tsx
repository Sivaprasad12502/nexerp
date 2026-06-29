"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  GREETING_TYPES,
  type GreetingTypeId,
} from "@/lib/greeting-templates";
import { uploadFile } from "@/lib/upload";

const labelCls = "mb-1 block text-sm font-medium text-zinc-700";
const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-[#7438dc] focus:outline-none focus:ring-1 focus:ring-[#7438dc]";

export function GreetingFormPanel({
  greetingType,
  businessName,
  message,
  logoUrl,
  removeBranding,
  downloading,
  onGreetingTypeChange,
  onBusinessNameChange,
  onMessageChange,
  onLogoChange,
  onRemoveBrandingChange,
  onUpdate,
  onDownload,
}: {
  greetingType: GreetingTypeId;
  businessName: string;
  message: string;
  logoUrl: string | null;
  removeBranding: boolean;
  downloading?: boolean;
  onGreetingTypeChange: (typeId: GreetingTypeId) => void;
  onBusinessNameChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onLogoChange: (url: string | null) => void;
  onRemoveBrandingChange: (value: boolean) => void;
  onUpdate: () => void;
  onDownload: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onLogoChange(url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <label className={labelCls}>
          Select Greeting Type <span className="text-red-500">*</span>
        </label>
        <select
          value={greetingType}
          onChange={(e) => onGreetingTypeChange(e.target.value as GreetingTypeId)}
          className={inputCls}
        >
          {GREETING_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          Your Business Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => onBusinessNameChange(e.target.value)}
          className={inputCls}
          placeholder="Your business name"
        />
      </div>

      <div>
        <label className={labelCls}>
          Message to be sent with the greeting <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className={inputCls}
          placeholder="Your greeting message"
        />
      </div>

      <div>
        <label className={labelCls}>Your Business Logo</label>
        {logoUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Logo"
              className="h-20 w-20 rounded border border-zinc-200 object-contain"
            />
            <button
              type="button"
              onClick={() => onLogoChange(null)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-zinc-200 hover:bg-red-50"
              aria-label="Remove logo"
            >
              <X className="size-3 text-zinc-500" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-zinc-400 hover:border-[#7438dc] hover:text-[#7438dc]"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Plus className="size-8" />
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={removeBranding}
          onChange={(e) => onRemoveBrandingChange(e.target.checked)}
          className="accent-[#7438dc]"
        />
        Remove Refrens Branding
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          onClick={onUpdate}
          className="bg-[#7438dc] hover:bg-[#6d28d9]"
        >
          Update
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDownload}
          disabled={downloading}
          className="border-[#7438dc] text-[#7438dc] hover:bg-[#f3effc]"
        >
          {downloading ? "Downloading…" : "Download Image"}
        </Button>
      </div>
    </div>
  );
}
