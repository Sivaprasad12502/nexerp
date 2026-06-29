"use client";

import { Copy, Mail, MessageCircle, Share2, X } from "lucide-react";
import { toast } from "sonner";

import type { GreetingTemplate } from "@/lib/greeting-templates";
import {
  buildShareText,
  copyShareText,
  shareToEmail,
  shareToFacebook,
  shareToLinkedIn,
  shareToTwitter,
  shareToWhatsApp,
} from "@/lib/export-greeting-image";
import { GreetingPreview } from "./greeting-preview";

export function ShareGreetingModal({
  open,
  onClose,
  template,
  businessName,
  message,
  logoUrl,
  removeBranding,
  greetingTypeLabel,
}: {
  open: boolean;
  onClose: () => void;
  template: GreetingTemplate;
  businessName: string;
  message: string;
  logoUrl: string | null;
  removeBranding: boolean;
  greetingTypeLabel: string;
}) {
  if (!open) return null;

  const shareText = buildShareText(businessName, message);
  const subject = `${greetingTypeLabel} greetings from ${businessName || "us"}`;

  const handleCopy = async () => {
    try {
      await copyShareText(shareText);
      toast.success("Message copied to clipboard");
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const socialButtons = [
    {
      label: "Facebook",
      content: "f",
      className: "bg-[#1877f2] text-white text-lg font-bold",
      onClick: () => shareToFacebook(shareText),
    },
    {
      label: "Twitter",
      content: "𝕏",
      className: "bg-[#1da1f2] text-white text-sm font-bold",
      onClick: () => shareToTwitter(shareText),
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      className: "bg-[#25d366] text-white",
      onClick: () => shareToWhatsApp(shareText),
    },
    {
      label: "LinkedIn",
      content: "in",
      className: "bg-[#0a66c2] text-white text-xs font-bold",
      onClick: () => shareToLinkedIn(shareText),
    },
    {
      label: "Email",
      icon: Mail,
      className: "bg-[#ea4335] text-white",
      onClick: () => shareToEmail(shareText, subject),
    },
    {
      label: "Copy",
      icon: Copy,
      className: "border border-[#7438dc] bg-white text-[#7438dc]",
      onClick: handleCopy,
    },
    {
      label: "Share",
      icon: Share2,
      className: "border border-[#7438dc] bg-white text-[#7438dc]",
      onClick: async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: subject, text: shareText });
          } catch {
            /* user cancelled */
          }
        } else {
          toast.info("Native share is not supported on this device");
        }
      },
    },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="pr-4 text-base font-semibold text-zinc-900">
            Share {greetingTypeLabel} greetings with your network!
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <GreetingPreview
            template={template}
            businessName={businessName}
            removeBranding={removeBranding}
            logoUrl={logoUrl}
          />

          <p className="text-center text-xs text-zinc-500">
            Social links share your message text. Download the image to attach it manually.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {socialButtons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                title={btn.label}
                className={`flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-90 ${btn.className}`}
                aria-label={btn.label}
              >
                {"icon" in btn && btn.icon ? (
                  <btn.icon className="size-5" />
                ) : (
                  <span>{"content" in btn ? btn.content : btn.label[0]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
