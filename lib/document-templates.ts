/** Template IDs and labels. Carousel previews are live-rendered via TemplatePreviewThumbnail. */
export const DOCUMENT_TEMPLATES = [
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "simple", label: "Simple" },
  { id: "classic", label: "Classic" },
] as const;

export type DocumentTemplateId = (typeof DOCUMENT_TEMPLATES)[number]["id"];
