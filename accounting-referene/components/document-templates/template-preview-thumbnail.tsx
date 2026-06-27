"use client";

import type { DocumentTemplateId } from "@/lib/document-templates";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { FONT_FAMILY } from "./constants";
import { QuotationDocumentLayout } from "./quotation-document-layout";
import { buildTemplatePreviewProps } from "./template-sample-data";

const PREVIEW_DOC_WIDTH = 794;
const THUMB_WIDTH = 260;

type TemplatePreviewThumbnailProps = {
  templateId: DocumentTemplateId;
  settings: QuotationSettings;
  documentLabel: string;
};

/** Live scaled-down document preview — matches the actual template layout. */
export function TemplatePreviewThumbnail({
  templateId,
  settings,
  documentLabel,
}: TemplatePreviewThumbnailProps) {
  const scale = THUMB_WIDTH / PREVIEW_DOC_WIDTH;
  const props = buildTemplatePreviewProps(templateId, settings, documentLabel);
  const fontFamily = FONT_FAMILY[settings.fontFamily] || FONT_FAMILY.inter;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded border border-zinc-200 bg-white shadow-sm"
      style={{ width: THUMB_WIDTH, height: 300 }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 origin-top"
        style={{
          width: PREVIEW_DOC_WIDTH,
          transform: `translateX(-50%) scale(${scale})`,
          fontFamily,
          fontSize: "13px",
          color: "#111",
          padding: "10px 75px",
        }}
      >
        <div className="bg-white px-5 py-4">
          <QuotationDocumentLayout {...props} />
        </div>
      </div>
    </div>
  );
}
