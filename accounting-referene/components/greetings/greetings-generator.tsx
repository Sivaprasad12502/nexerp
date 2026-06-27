"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  DEFAULT_GREETING_TYPE,
  getDefaultMessage,
  getGreetingType,
  getTemplate,
  getTemplatesForType,
  type GreetingTypeId,
} from "@/lib/greeting-templates";
import {
  exportGreetingAsPng,
} from "@/lib/export-greeting-image";
import { GreetingFormPanel } from "./greeting-form-panel";
import { GreetingPreview } from "./greeting-preview";
import { GreetingsPageHeader } from "./greetings-page-header";
import { ShareGreetingModal } from "./share-greeting-modal";
import { TemplatePicker } from "./template-picker";

export function GreetingsGenerator() {
  const previewRef = useRef<HTMLDivElement>(null);

  const [greetingType, setGreetingType] = useState<GreetingTypeId>(DEFAULT_GREETING_TYPE);
  const [templateId, setTemplateId] = useState(
    () => getTemplatesForType(DEFAULT_GREETING_TYPE)[0]?.id ?? "template-1",
  );
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState(getDefaultMessage(DEFAULT_GREETING_TYPE));
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [removeBranding, setRemoveBranding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [businessLoaded, setBusinessLoaded] = useState(false);

  const { data: businessData } = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const res = await fetch("/api/business");
      if (!res.ok) return null;
      return res.json() as Promise<{ business?: { brandName?: string | null; name?: string } }>;
    },
    staleTime: 60_000,
  });

  const orgName =
    businessData?.business?.brandName?.trim() ||
    businessData?.business?.name?.trim() ||
    "Business";

  useEffect(() => {
    if (businessLoaded || !businessData?.business) return;
    const name =
      businessData.business.brandName?.trim() ||
      businessData.business.name?.trim() ||
      "";
    if (name) setBusinessName(name);
    setBusinessLoaded(true);
  }, [businessData, businessLoaded]);

  const templates = getTemplatesForType(greetingType);
  const template =
    getTemplate(greetingType, templateId) ?? templates[0] ?? getTemplatesForType("christmas")[0];

  const handleTypeChange = (typeId: GreetingTypeId) => {
    setGreetingType(typeId);
    const nextTemplates = getTemplatesForType(typeId);
    setTemplateId(nextTemplates[0]?.id ?? "template-1");
    setMessage(getDefaultMessage(typeId));
  };

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setDownloading(true);
    try {
      const slug = businessName.trim().replace(/\s+/g, "-").toLowerCase();
      await exportGreetingAsPng(
        previewRef.current,
        `${slug}-${greetingType}.png`,
      );
      toast.success("Greeting image downloaded");
    } catch {
      toast.error("Failed to download image");
    } finally {
      setDownloading(false);
    }
  }, [businessName, greetingType]);

  const handleUpdate = () => {
    toast.success("Preview updated");
  };

  const greetingTypeLabel = getGreetingType(greetingType).label;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      <GreetingsPageHeader
        orgName={orgName}
        onShare={() => {
          if (!message.trim()) {
            toast.error("Message is required");
            return;
          }
          setShareOpen(true);
        }}
        onDownload={handleDownload}
        downloading={downloading}
      />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-2 lg:px-8">
        <div className="flex items-start justify-center">
          {template && (
            <GreetingPreview
              ref={previewRef}
              template={template}
              businessName={businessName}
              removeBranding={removeBranding}
              logoUrl={logoUrl}
            />
          )}
        </div>

        <GreetingFormPanel
          greetingType={greetingType}
          businessName={businessName}
          message={message}
          logoUrl={logoUrl}
          removeBranding={removeBranding}
          downloading={downloading}
          onGreetingTypeChange={handleTypeChange}
          onBusinessNameChange={setBusinessName}
          onMessageChange={setMessage}
          onLogoChange={setLogoUrl}
          onRemoveBrandingChange={setRemoveBranding}
          onUpdate={handleUpdate}
          onDownload={handleDownload}
        />
      </div>

      {template && (
        <TemplatePicker
          templates={templates}
          selectedId={template.id}
          onSelect={setTemplateId}
        />
      )}

      {template && (
        <ShareGreetingModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          template={template}
          businessName={businessName}
          message={message}
          logoUrl={logoUrl}
          removeBranding={removeBranding}
          greetingTypeLabel={greetingTypeLabel}
        />
      )}
    </div>
  );
}
