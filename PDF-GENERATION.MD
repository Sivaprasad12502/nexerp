# Dynamic PDF Generation — Implementation Plan

> **Companion to:** [Project-Guide.md](./Project-Guide.md)  
> **Goal:** Refrens-style PDFs where users **design once** (layout, labels, fields, positions) and **reuse forever** by only filling document data (invoice, quotation, proforma, etc.).

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Core Concepts](#2-core-concepts)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model](#4-data-model)
5. [Template JSON Schema](#5-template-json-schema)
6. [Customization Capabilities](#6-customization-capabilities)
7. [PDF Render Pipeline](#7-pdf-render-pipeline)
8. [Alignment & Layout Rules](#8-alignment--layout-rules)
9. [Per Document Type](#9-per-document-type)
10. [User Flows](#10-user-flows)
11. [Code Structure](#11-code-structure)
12. [API & Server Actions](#12-api--server-actions)
13. [Implementation Phases](#13-implementation-phases)
14. [Testing & Definition of Done](#14-testing--definition-of-done)
15. [Risks & Decisions](#15-risks--decisions)
16. [Technology Choice: react-pdf vs Puppeteer (HTML/CSS)](#16-technology-choice-react-pdf-vs-puppeteer-htmlcss)

---

## 1. Product Summary

### What the user can do

| Capability | Description |
|------------|-------------|
| **Pick document type** | Invoice, Quotation, Proforma, Sales Order, Delivery Challan, Credit Note, Receipt, etc. |
| **Pick or design template** | Multiple visual designs per type (Classic, Modern, GST, Minimal…) |
| **Customize labels** | Rename "Invoice Date" → "Bill Date"; rename document title |
| **Add custom fields** | Header/footer/line columns with stable `fieldKey` + user-defined label |
| **Reorder & reposition** | Change block order (logo, client, meta); reorder table columns |
| **Swap positions** | Move blocks left/right (e.g. business left, client right) via layout grid |
| **Show/hide fields** | Toggle visibility on form and PDF independently |
| **Save template** | Persist layout + field defs; set as default for that `document_type` |
| **Reuse template** | New document → select template → **only fill data**; PDF matches saved design |
| **Preview PDF** | Live preview while editing template; fixture data for stress test |

### What is frozen vs editable

| Layer | Editable when designing template | Filled per document instance |
|-------|-----------------------------------|------------------------------|
| Block order, colors, fonts | Yes | No (from template) |
| Field labels, visibility, column order | Yes | No |
| Custom field **definitions** | Yes (template/settings) | — |
| Custom field **values** | Default only | Yes (each invoice) |
| Client name, amounts, line items | — | Yes |
| Tax amounts | — | Yes (calculated; snapshot on save) |

---

## 2. Core Concepts

### Three-layer model

```text
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Template (saved, reusable)                            │
│  DocumentTemplate + FieldDefinitions + Layout JSON               │
│  "How it looks" + "which fields exist"                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ user picks templateId
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — Document instance (one invoice / quotation)           │
│  documents + line_items + custom_field_values + snapshots        │
│  "The actual data"                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ queue generate-pdf
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — PDF output                                            │
│  renderTemplate(layout, mergeData) → Buffer → S3 → pdfUrl        │
└─────────────────────────────────────────────────────────────────┘
```

### Stable keys vs display labels

| Concept | Rule |
|---------|------|
| `fieldKey` | Never changes (`due_date`, `po_number`, `custom_abc`). Used in DB, formulas, PDF binding. |
| `label` | User-editable ("Due Date", "PO #"). Shown on form and PDF header. |
| `dataPath` | Where value comes from: `document.dueDate`, `customFieldValues.po_number`, `line.values.hsn` |

Renaming a label **must not** break saved documents.

### Template vs document snapshot

On **document save**, snapshot so PDFs do not change when template is edited later:

- `documents.templateId` — which design was used
- `documents.templateVersion` — optional version number at save time
- `documents.customFieldValues` — header/footer values
- `documents.displayOptions` — PDF toggles (total in words, HSN summary, etc.)
- `documents.clientSnapshot`, `businessSnapshot`
- Computed totals + `taxBreakdown`

---

## 3. Architecture Overview

```text
                    Template Designer UI
                    (business-settings/templates)
                              │
                              ▼
                    saveTemplate(layout, fields)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  document_templates   document_field_definitions   document_template_fields
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
     Document Editor UI       │         (invoice / quotation pages)
     (fill data only)         │
                              ▼
                    saveDocument(data + templateId)
                              │
                              ▼
                    documents (+ items, custom values)
                              │
                              ▼
              queuePDFGeneration(documentId)  ──►  BullMQ worker
                              │
                              ▼
              buildPdfPayload(document, template, fields)
                              │
                              ▼
              getPdfRenderer(documentType) → react-pdf → Buffer
                              │
                              ▼
              S3 upload → documents.pdfUrl
```

### Tech stack (recommended — see §16)

| Piece | Choice |
|-------|--------|
| PDF rendering | **Puppeteer** or **Playwright** (HTML → PDF via headless Chrome) |
| Templates | HTML + CSS stored in DB (`templateHtml` + `templateCss`) or compiled from layout JSON |
| Data injection | Server-side template engine (Handlebars / React `renderToStaticMarkup`) |
| Post-process (merge, stamp) | `pdf-lib` (optional) |
| Queue | BullMQ + Redis (PDF worker must run Chrome — not serverless Edge) |
| Storage | S3 (`businesses/{businessId}/documents/{documentId}/{type}.pdf`) |
| Validation | Zod on layout JSON + sanitize HTML (no raw user script) |
| Fonts | Google Fonts / self-hosted in CSS (`@font-face`) |

> **Alternative:** `@react-pdf/renderer` — lighter infra but weaker CSS and alignment vs browser. Use only if you skip a visual HTML designer.

### Country-aware PDF

Templates are scoped per `document_type` **and** respect `business.taxCountry`:

- India (`IN`): CGST/SGST/IGST columns, GSTIN, place of supply
- UAE (`AE`): VAT column, TRN — hide GST columns

Seed **separate default templates** per country for the same `document_type` if needed.

---

## 4. Data Model

### Prisma (add to `packages/database/prisma/models/`)

```prisma
// models/billing/document-template.prisma

model DocumentTemplate {
  id           String       @id @default(uuid()) @db.Uuid
  businessId   String?      @map("business_id") @db.Uuid  // null = system shipped
  documentType DocumentType @map("document_type")
  taxCountry   TaxCountry?  @map("tax_country")          // null = both; or IN/AE specific
  name         String
  slug         String
  description  String?
  isDefault    Boolean      @default(false) @map("is_default")
  isActive     Boolean      @default(true) @map("is_active")
  version      Int          @default(1)

  layout       Json         // blocks, theme, lineItemColumns — see §5
  thumbnailKey String?      @map("thumbnail_key")

  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  business  Business?              @relation(fields: [businessId], references: [id], onDelete: Cascade)
  fields    DocumentTemplateField[]
  documents Document[]

  @@unique([businessId, documentType, slug])
  @@index([businessId, documentType, isDefault])
  @@map("document_templates")
}

model DocumentFieldDefinition {
  id           String       @id @default(uuid()) @db.Uuid
  businessId   String?      @map("business_id") @db.Uuid
  templateId   String?      @map("template_id") @db.Uuid  // null = tenant-wide for type
  documentType DocumentType @map("document_type")
  fieldKey     String       @map("field_key")
  label        String
  dataPath     String?      @map("data_path")   // binding path; auto for system fields
  fieldType    FieldType    @map("field_type")
  section      FieldSection
  isSystem     Boolean      @default(false) @map("is_system")
  isVisible    Boolean      @default(true) @map("is_visible")
  isRequired   Boolean      @default(false) @map("is_required")
  showOnPdf    Boolean      @default(true) @map("show_on_pdf")
  showOnForm   Boolean      @default(true) @map("show_on_form")
  sortOrder    Int          @default(0) @map("sort_order")
  defaultValue Json?        @map("default_value")
  options      Json?
  validation   Json?
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  business Business?         @relation(fields: [businessId], references: [id], onDelete: Cascade)
  template DocumentTemplate? @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([businessId, documentType, fieldKey, templateId])
  @@index([businessId, documentType])
  @@map("document_field_definitions")
}

model DocumentTemplateField {
  id          String  @id @default(uuid()) @db.Uuid
  templateId  String  @map("template_id") @db.Uuid
  fieldKey    String  @map("field_key")
  label       String?                        // override label for this template only
  isVisible   Boolean @default(true) @map("is_visible")
  sortOrder   Int     @default(0) @map("sort_order")
  widthBp     Int?    @map("width_bp")      // line columns: sum visible = 10000
  align       String? // left | right | center
  blockId     String? @map("block_id")      // which layout block owns this field
  style       Json?

  template DocumentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, fieldKey])
  @@map("document_template_fields")
}
```

### Extend `Document` (already in Project-Guide)

```prisma
  templateId       String?   @map("template_id") @db.Uuid
  templateVersion  Int?      @map("template_version")
  title            String?   // editable "Invoice" heading
  subtitle         String?
  customFieldValues Json?    @map("custom_field_values")
  displayOptions   Json?     @map("display_options")
  pdfUrl           String?   @map("pdf_url")
  pdfGeneratedAt   DateTime? @map("pdf_generated_at")
```

---

## 5. Template JSON Schema

Store in `DocumentTemplate.layout`. Validate with Zod on every save.

```ts
// packages/validations/pdf-template-layout.schema.ts

export const templateLayoutSchema = z.object({
  page: z.object({
    size: z.enum(['A4', 'LETTER']).default('A4'),
    margin: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
  }),

  theme: z.object({
    primaryColor: z.string(),
    fontFamily: z.string().default('Inter'),
    baseFontSize: z.number().default(10),
    headingFontSize: z.number().default(14),
  }),

  // Page blocks — reorderable, swappable left/right via grid
  blocks: z.array(z.object({
    id: z.string(),
    type: z.enum([
      'logo',
      'document_title',      // uses document.title
      'business_info',
      'client_info',
      'ship_to',
      'document_meta',       // number, dates, custom header fields
      'line_items_table',
      'tax_summary',
      'totals',
      'notes',
      'terms',
      'bank_details',
      'signature',
      'qr_code',             // e-invoice IN
      'custom_block',
    ]),
    visible: z.boolean().default(true),
    order: z.number(),
    grid: z.object({
      colStart: z.number().min(1).max(12),
      colSpan: z.number().min(1).max(12),
    }),
    config: z.record(z.unknown()).optional(),
  })),

  // Line table columns — reorderable, width in basis points
  lineItemColumns: z.array(z.object({
    fieldKey: z.string(),
    header: z.string(),              // PDF column header (editable label)
    dataPath: z.string(),            // e.g. line.values.rate
    widthBp: z.number().int(),
    align: z.enum(['left', 'right', 'center']).default('left'),
    kind: z.enum(['input', 'computed']).default('input'),
    visible: z.boolean().default(true),
  })).refine(
    (cols) => cols.filter(c => c.visible).reduce((s, c) => s + c.widthBp, 0) === 10000,
    { message: 'Visible column widths must total 10000 basis points (100%)' }
  ),

  displayOptions: z.object({
    showTotalInWords: z.boolean().default(true),
    showTaxSummary: z.boolean().default(false),
    descriptionFullWidth: z.boolean().default(false),
    // ... extend per Project-Guide display options
  }).optional(),
});
```

### Example layout (invoice — two-column header)

```json
{
  "page": { "size": "A4", "margin": { "top": 40, "right": 40, "bottom": 40, "left": 40 } },
  "theme": { "primaryColor": "#4F46E5", "fontFamily": "Inter", "baseFontSize": 10 },
  "blocks": [
    { "id": "b1", "type": "logo", "visible": true, "order": 1, "grid": { "colStart": 1, "colSpan": 4 } },
    { "id": "b2", "type": "document_meta", "visible": true, "order": 2, "grid": { "colStart": 7, "colSpan": 6 } },
    { "id": "b3", "type": "business_info", "visible": true, "order": 3, "grid": { "colStart": 1, "colSpan": 6 } },
    { "id": "b4", "type": "client_info", "visible": true, "order": 4, "grid": { "colStart": 7, "colSpan": 6 } },
    { "id": "b5", "type": "line_items_table", "visible": true, "order": 5, "grid": { "colStart": 1, "colSpan": 12 } },
    { "id": "b6", "type": "totals", "visible": true, "order": 6, "grid": { "colStart": 8, "colSpan": 5 } },
    { "id": "b7", "type": "terms", "visible": true, "order": 7, "grid": { "colStart": 1, "colSpan": 12 } }
  ],
  "lineItemColumns": [
    { "fieldKey": "item", "header": "Item", "dataPath": "line.name", "widthBp": 3000, "align": "left", "kind": "input", "visible": true },
    { "fieldKey": "hsn", "header": "HSN", "dataPath": "line.hsn", "widthBp": 1200, "align": "left", "kind": "input", "visible": true },
    { "fieldKey": "qty", "header": "Qty", "dataPath": "line.quantity", "widthBp": 1000, "align": "right", "kind": "input", "visible": true },
    { "fieldKey": "rate", "header": "Rate", "dataPath": "line.rate", "widthBp": 1500, "align": "right", "kind": "input", "visible": true },
    { "fieldKey": "amount", "header": "Amount", "dataPath": "line.amount", "widthBp": 1800, "align": "right", "kind": "computed", "visible": true },
    { "fieldKey": "total", "header": "Total", "dataPath": "line.total", "widthBp": 1500, "align": "right", "kind": "computed", "visible": true }
  ]
}
```

---

## 6. Customization Capabilities

### Feature matrix

| User action | Where stored | PDF impact |
|-------------|--------------|------------|
| Rename field label | `DocumentFieldDefinition.label` or `DocumentTemplateField.label` | Header/column text |
| Add custom field | New `fieldKey` + `section` | New cell in meta or table |
| Delete custom field | Soft-hide `isVisible: false` | Hidden |
| Reorder header fields | `sortOrder` | Block field order |
| Reorder table columns | `lineItemColumns[].order` + `widthBp` | Column order/width |
| Swap business ↔ client | Change `blocks[].grid.colStart` | Left/right position |
| Change colors/fonts | `layout.theme` | Global style |
| Toggle block | `blocks[].visible` | Section on/off |
| Set default template | `isDefault` per `document_type` | New docs pre-select |
| Duplicate template | New `slug`, copy layout + fields | New reusable design |

### Template designer vs document editor

| Screen | Route | User does |
|--------|-------|-----------|
| **Template designer** | `/business-settings/templates/[templateId]/design` | Layout, labels, columns, blocks — **no real client data** |
| **Document editor** | `/sales-and-invoices/invoices/[id]/edit` | Fill values only; template locked or switchable before first save |
| **Template picker** | Modal on create document | Choose saved template |

Use **fixture data** in template designer preview (long names, 10 lines, big amounts).

### Custom field flow

```text
1. User clicks "+ Add Custom Field" in template designer (or document editor if allowed)
2. System generates fieldKey: custom_{nanoid}
3. User sets: label, type, section (HEADER | LINE_ITEMS | FOOTER), required?
4. Save → DocumentFieldDefinition row
5. Template designer places field in block or lineItemColumns
6. Document editor shows input bound to customFieldValues[fieldKey]
7. PDF renderer reads customFieldValues[fieldKey] via dataPath
```

---

## 7. PDF Render Pipeline

### Step-by-step

```ts
// modules/shared/documents/pdf/pdf.service.ts

export async function queuePDFGeneration(documentId: string, businessId: string) {
  await pdfQueue.add('generate-pdf', { documentId, businessId }, { attempts: 3 });
}

// Worker
async function handleGeneratePdf(job) {
  const { documentId, businessId } = job.data;

  // 1. Load document + items + snapshots (tenant-scoped)
  const document = await loadDocumentForPdf(documentId, businessId);

  // 2. Resolve template (document.templateId OR default for type + taxCountry)
  const template = await resolveTemplate(document);

  // 3. Load field definitions + template field overrides
  const fields = await loadTemplateFields(template.id, document.businessId);

  // 4. Build normalized payload (single shape for all renderers)
  const payload = buildPdfPayload({ document, template, fields });

  // 5. Pick renderer by documentType
  const buffer = await renderDocumentPdf(document.documentType, payload);

  // 6. Upload S3
  const key = `businesses/${businessId}/documents/${documentId}/${document.documentType.toLowerCase()}.pdf`;
  await uploadToS3(key, buffer);

  // 7. Update document
  await prisma.document.update({
    where: { id: documentId },
    data: { pdfUrl: await presign(key), pdfGeneratedAt: new Date() },
  });
}
```

### `buildPdfPayload` output shape

```ts
type PdfPayload = {
  documentType: DocumentType;
  taxCountry: TaxCountry;
  title: string;
  subtitle?: string;
  business: BusinessSnapshot;
  client: ClientSnapshot | null;
  meta: Record<string, unknown>;      // merged system + customFieldValues
  lines: LinePayload[];
  totals: TotalsSnapshot;
  taxBreakdown: TaxBreakdown;
  displayOptions: DisplayOptions;
  layout: TemplateLayout;             // from template
  columns: ResolvedColumn[];          // merged lineItemColumns + overrides
  currency: string;
  locale: string;
};
```

### Renderer registry (one per document type)

```ts
// modules/shared/documents/pdf/renderer-registry.ts

const renderers: Partial<Record<DocumentType, PdfRenderer>> = {
  INVOICE: renderInvoicePdf,
  QUOTATION: renderQuotationPdf,
  PROFORMA: renderProformaPdf,
  SALES_ORDER: renderSalesOrderPdf,
  DELIVERY_CHALLAN: renderChallanPdf,
  CREDIT_NOTE: renderCreditNotePdf,
  RECEIPT: renderReceiptPdf,
  DEBIT_NOTE: renderDebitNotePdf,
  PURCHASE_ORDER: renderPurchaseOrderPdf,
};

export function renderDocumentPdf(type: DocumentType, payload: PdfPayload): Promise<Buffer> {
  const render = renderers[type];
  if (!render) throw new UnsupportedDocumentTypeError(type);
  return render(payload);
}
```

Each renderer uses shared building blocks:

- `PdfPage` — margins, font from `layout.page` / `layout.theme`
- `PdfBlockRenderer` — switch on `block.type`
- `PdfLineItemsTable` — columns from `payload.columns`, rows from `payload.lines`
- `PdfTotalsBlock` — subtotal, tax lines, grand total, total in words

---

## 8. Alignment & Layout Rules

PDF alignment breaks if columns are free-form. Enforce these rules in template save validation and renderer.

| Rule | Implementation |
|------|----------------|
| 12-column grid for blocks | `grid.colStart` + `colSpan`; no absolute x/y |
| Column widths sum to 100% | `widthBp` total = 10000 for visible columns |
| Same columns for header + rows | Single `ResolvedColumn[]` array |
| Precompute pixel widths | `pixelWidth = (widthBp / 10000) * tableWidth` once per render |
| Money/qty right-aligned | `align: 'right'` + tabular font |
| Long text | `maxLines` + truncate or wrap per column config |
| Template preview | Generate PDF with fixture data on save |

```tsx
// PdfLineItemsTable — shared across all document types
<View style={{ flexDirection: 'row', width: tableWidth }}>
  {columns.map(col => (
    <View key={col.fieldKey} style={{ width: col.pixelWidth, flexShrink: 0 }}>
      <Text style={{ textAlign: col.align, fontFamily: col.isNumeric ? 'InterTabular' : 'Inter' }}>
        {formatValue(getByPath(line, col.dataPath), col)}
      </Text>
    </View>
  ))}
</View>
```

---

## 9. Per Document Type

Each type has **separate default templates** and **optional separate renderer** (can share 80% via `PdfBlockRenderer`).

| DocumentType | Default templates (seed) | Special PDF blocks |
|--------------|---------------------------|-------------------|
| `QUOTATION` | Classic Quote, Modern Quote | `valid_until`, no payment block |
| `INVOICE` | Tax Invoice GST, Simple, Professional | tax_summary, bank_details, qr_code (IN) |
| `PROFORMA` | Proforma Standard | "Proforma" title watermark optional |
| `SALES_ORDER` | SO Standard | delivery date, PO ref |
| `DELIVERY_CHALLAN` | With transport, Simple | transport, e-way fields |
| `CREDIT_NOTE` | CN GST | reference invoice number |
| `DEBIT_NOTE` | DN GST | purchase-side |
| `RECEIPT` | Payment Receipt | payment mode, allocation list |
| `PURCHASE_ORDER` | PO Standard | vendor block not client |

**MVP order:** Quotation → Invoice → Receipt → Credit Note → others.

---

## 10. User Flows

### Flow A — Design a new template (once)

```text
Business Settings → Templates → [Invoice] → Create template
  → Template designer opens (fixture preview)
  → User: rename labels, add custom field, drag block order, edit columns
  → Save template → Zod validate layout → generate preview PDF → S3 thumbnail
  → Set as default (optional)
```

### Flow B — Create document using saved template (repeat)

```text
Sales & Invoices → Invoices → New
  → Pick template (default pre-selected)
  → Document editor: fill client, lines, custom values only
  → Save → server calculates tax → queue PDF
  → Download / email PDF
```

### Flow C — Change template on draft

```text
Draft document → Change template (dropdown)
  → Warn: layout may differ; custom fields mapped by fieldKey
  → Re-render preview PDF
```

### Flow D — Duplicate template

```text
Templates list → Duplicate "Modern GST Invoice"
  → New slug: modern-gst-invoice-copy
  → User edits copy without affecting original
```

---

## 11. Code Structure

Align with [Project-Guide.md §5](./Project-Guide.md#5-repository-layout):

```text
modules/
├── shared/documents/
│   ├── pdf/
│   │   ├── pdf.service.ts              # queue, worker handler
│   │   ├── build-pdf-payload.ts        # merge document + template → PdfPayload
│   │   ├── resolve-template.ts
│   │   ├── renderer-registry.ts
│   │   ├── blocks/                     # PdfBlockRenderer per block type
│   │   │   ├── logo-block.tsx
│   │   │   ├── client-info-block.tsx
│   │   │   ├── line-items-table.tsx
│   │   │   └── totals-block.tsx
│   │   ├── renderers/
│   │   │   ├── invoice.renderer.tsx
│   │   │   ├── quotation.renderer.tsx
│   │   │   └── ...
│   │   └── fonts/                      # register Inter
│   └── engine/                         # document save, numbering (existing)
│
├── business-settings/templates/
│   ├── template.actions.ts             # CRUD templates
│   ├── template-designer/              # layout editor UI
│   │   ├── template-designer.tsx
│   │   ├── block-list.tsx
│   │   ├── column-editor.tsx
│   │   └── field-label-editor.tsx
│   └── components/template-picker.tsx
│
└── sales-and-invoices/invoices/
    └── ...                             # document editor; calls pdf.service

packages/
├── validations/pdf-template-layout.schema.ts
└── calculations/                       # totals used in PdfPayload
```

---

## 12. API & Server Actions

| Action | Location | Purpose |
|--------|----------|---------|
| `createTemplate` | `template.actions.ts` | New template + default layout seed |
| `updateTemplateLayout` | `template.actions.ts` | Save layout JSON + validate |
| `updateTemplateFields` | `template.actions.ts` | Sync DocumentTemplateField rows |
| `duplicateTemplate` | `template.actions.ts` | Copy layout + fields |
| `setDefaultTemplate` | `template.actions.ts` | One default per type per business |
| `previewTemplatePdf` | `template.actions.ts` | Fixture data → PDF bytes / URL |
| `saveDocument` | `invoice.actions.ts` | Data + templateId → queue PDF |
| `regeneratePdf` | `pdf.service.ts` | Manual refresh after edit |

All actions: auth → tenant → `can('settings.templates')` or `can('document.edit')`.

---

## 13. Implementation Phases

### Phase PDF-1 — Foundation (1 week)

- [ ] Prisma: `DocumentTemplate`, `DocumentFieldDefinition`, `DocumentTemplateField`
- [ ] Zod `templateLayoutSchema`
- [ ] Seed 1 system template per type (Invoice, Quotation) for `IN` and `AE`
- [ ] `buildPdfPayload` + fixture data
- [ ] Single renderer: `INVOICE` only, fixed layout (no designer UI yet)
- [ ] BullMQ worker + S3 upload + `pdfUrl` on document

### Phase PDF-2 — Dynamic layout engine (1.5 weeks)

- [ ] `PdfBlockRenderer` driven by `layout.blocks` order + grid
- [ ] `PdfLineItemsTable` driven by `lineItemColumns` + widthBp validation
- [ ] Renderer registry: Quotation, Proforma, Credit Note
- [ ] `resolveTemplate` (default + document.templateId)
- [ ] Regenerate PDF on document update

### Phase PDF-3 — Template designer UI (2 weeks)

- [ ] Template list in Business Settings
- [ ] Block reorder + show/hide + grid colStart/colSpan (swap positions)
- [ ] Column editor: reorder, rename header, width presets, show/hide
- [ ] Custom field CRUD in designer
- [ ] Live PDF preview (iframe or download) with fixture data
- [ ] Save + duplicate + set default

### Phase PDF-4 — Document editor integration (1 week)

- [ ] Template picker on create invoice/quotation
- [ ] Dynamic form from field definitions (fill data only)
- [ ] Map `customFieldValues` → PDF meta
- [ ] Snapshot `templateVersion`, `displayOptions` on save
- [ ] Country-specific columns from `getTaxProfile(taxCountry)`

### Phase PDF-5 — Polish (1 week)

- [ ] Thumbnail generation on template save
- [ ] PDF caching: skip regenerate if document unchanged (hash)
- [ ] Email attachment uses same PDF pipeline
- [ ] Unit tests: layout validation, payload builder, column width sum
- [ ] Visual regression: fixture PDFs per template

**Total estimate:** ~6.5 weeks (can overlap with Sprint 7 in Project-Guide).

---

## 14. Testing & Definition of Done

### Unit tests

- Layout schema rejects `widthBp` sum ≠ 10000
- `buildPdfPayload` maps all system fields + custom fields
- `getByPath` resolves `line.values.*` and `customFieldValues.*`
- India vs UAE column sets differ by `taxCountry`

### Integration tests

- Save template → create document → worker → PDF exists in S3
- Change label in template does not change old document PDF (snapshot)
- Tenant A cannot load tenant B template

### Product DoD

- [ ] User saves custom template and reuses it on 10+ invoices without redesigning
- [ ] User renames fields, adds custom field, reorders columns, swaps business/client blocks
- [ ] PDF matches preview for fixture and real document
- [ ] Works for Invoice + Quotation minimum; extensible to other types
- [ ] IN and AE tax columns correct per country

---

## 15. Risks & Decisions

| Risk | Mitigation |
|------|------------|
| react-pdf layout differs from browser designer | Designer previews **actual PDF**, not HTML mock |
| Too much free-form drag breaks alignment | 12-col grid + widthBp presets only (no pixel drag) |
| Template edit breaks old PDFs | Snapshot `templateVersion` + store `pdfUrl`; optional regenerate |
| Performance on large line tables | Paginate line items in renderer; async queue only |
| User `eval` for formulas | Safe DSL only in calculations package — not in PDF layer |

### Decisions to lock early

1. **HTML/CSS + headless Chrome for PDF** — recommended over react-pdf for this product (§16).
2. **One `documents` table** — all types share engine; PDF differs by `documentType` + template.
3. **fieldKey is immutable** — labels and positions are mutable.
4. **Templates are per `businessId`** — system templates cloned on signup.
5. **Designer preview = same HTML** used for PDF (WYSIWYG).

---

## 16. Technology Choice: react-pdf vs Puppeteer (HTML/CSS)

### Short answer

**For your requirements** (custom labels, swap block positions, add fields, reuse templates, alignment with real/long data) — **yes, Puppeteer (or Playwright) with HTML/CSS templates is usually the better choice** than react-pdf.

You inject data into HTML, preview in the browser with **live document data**, and PDF print uses the **same layout engine** (Chromium). That directly fixes the “alignment differs between editor and PDF” problem that react-pdf (Yoga flexbox) causes.

---

### Comparison

| Criteria | **Puppeteer / Playwright + HTML/CSS** | **@react-pdf/renderer** |
|----------|--------------------------------------|---------------------------|
| **Alignment & CSS** | Full CSS Grid/Flexbox, tables, `text-align`, print CSS | Subset of flexbox; not real CSS |
| **WYSIWYG preview** | Designer iframe = same HTML → PDF | Preview ≠ browser; must render PDF to verify |
| **Live data preview** | Pass real `PdfPayload` into template → preview in browser | Rebuild PDF on every preview (slower) |
| **Custom templates** | Natural: saved HTML/CSS per template | Rebuild React components from JSON blocks |
| **Swap positions** | CSS grid areas, `order`, columns | Manual `widthBp` + block grid in JSON |
| **Developer familiarity** | Standard web skills | react-pdf-specific API |
| **Infra** | Chrome in worker (~200–400MB RAM/job) | Lightweight Node only |
| **Serverless** | Hard on Vercel Edge; needs Docker/ECS worker | Easier on small functions |
| **Speed** | ~1–3s per PDF (cold start worse) | ~200–800ms per PDF |
| **Multi-page / page breaks** | `@page`, `break-inside: avoid` (print CSS) | Supported but fiddly |
| **Security** | Must sanitize HTML; sandbox browser | No arbitrary HTML |
| **Maintenance** | Chrome updates, puppeteer version pin | Fewer moving parts |

---

### Recommended architecture (HTML/CSS + Puppeteer)

```text
DocumentTemplate
  ├── templateHtml    # or generate from layout JSON → HTML compiler
  ├── templateCss
  └── layout JSON     # optional: designer saves JSON, compile to HTML on save

buildPdfPayload(document) → PdfPayload

compileTemplate(template, payload)
  → full HTML string (Handlebars / EJS / React SSR)

Puppeteer:
  page.setContent(html, { waitUntil: 'networkidle0' })
  page.pdf({ format: 'A4', printBackground: true, margin: ... })
  → Buffer → S3
```

### Template example (concept)

```html
<!-- Stored per DocumentTemplate — placeholders use fieldKey -->
<div class="header grid-2">
  <section class="business">{{business.name}}</section>
  <section class="meta">
    <div>{{labels.invoice_no}}: {{document.documentNumber}}</div>
    <div>{{labels.due_date}}: {{document.dueDate}}</div>
    {{#each metaFields}}<div>{{label}}: {{value}}</div>{{/each}}
  </section>
</div>

<table class="line-items">
  <thead>
    <tr>{{#each columns}}<th style="width:{{width}}">{{header}}</th>{{/each}}</tr>
  </thead>
  <tbody>
    {{#each lines}}
    <tr>{{#each ../columns}}<td class="{{align}}">{{lookup .. fieldKey}}</td>{{/each}}</tr>
    {{/each}}
  </tbody>
</table>
```

```css
.line-items td.amount { text-align: right; font-variant-numeric: tabular-nums; }
@media print { .line-items tr { break-inside: avoid; } }
```

**Live preview:** same HTML rendered in an iframe in the template designer and document editor with current `PdfPayload` (no Puppeteer needed for preview — only for final PDF/email).

---

### When react-pdf is still better

- Very high PDF volume, minimal styling, no visual designer
- Strict serverless-only deploy with no dedicated worker
- No user-editable HTML (fully fixed layouts coded once by devs)

That is **not** your Refrens-style product.

---

### Playwright vs Puppeteer

| | Puppeteer | Playwright |
|---|-----------|------------|
| Maintained by | Chrome team | Microsoft |
| API | Mature, huge ecosystem | Similar, slightly better DX |
| Recommendation | Either is fine | **Playwright** if starting fresh (better timeouts, tracing) |

Use **one dedicated PDF worker container** (Docker) with Chrome installed — not the Next.js server process.

---

### Updated pipeline (replace §7 worker step)

```ts
// modules/shared/documents/pdf/html-pdf.service.ts

export async function renderHtmlToPdf(html: string, css: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(wrapHtml(html, css), { waitUntil: 'networkidle0' });
  const buffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });
  await browser.close();
  return Buffer.from(buffer);
}

export async function generateDocumentPdf(documentId: string, businessId: string) {
  const payload = await buildPdfPayload(documentId, businessId);
  const template = await resolveTemplate(payload);
  const html = compileTemplate(template, payload);  // Handlebars / SSR
  return renderHtmlToPdf(html, template.css);
}
```

---

### Security (HTML templates)

| Rule | Why |
|------|-----|
| **No raw user HTML in MVP** | Users edit via structured designer → you generate HTML |
| Sanitize if allowing HTML blocks | DOMPurify on save |
| Disable JS in PDF page | `page.setJavaScriptEnabled(false)` |
| Sandbox worker | Separate container, no access to main DB credentials beyond job |
| Tenant scope | Template `businessId` check before compile |

---

### Impact on implementation phases

| Phase | Change |
|-------|--------|
| PDF-1 | Puppeteer/Playwright worker + 1 Handlebars invoice template |
| PDF-2 | Dynamic columns/sections via template partials, not react-pdf blocks |
| PDF-3 | Designer edits layout → compiles to HTML/CSS (or visual HTML editor) |
| PDF-4 | Live iframe preview with `buildPdfPayload` — **no queue for preview** |
| PDF-5 | Docker worker image, concurrency limits, Chrome memory caps |

**Infra add-on:** PDF worker service in `docker-compose.yml` (same as BullMQ worker).

---

### Final recommendation

| Choose | If |
|--------|-----|
| **Puppeteer/Playwright + HTML/CSS** | You want Refrens-level customization, live alignment with real data, faster designer iteration (**recommended for this project**) |


---

## Related documents

- [Project-Guide.md](./Project-Guide.md) — tenant isolation, document engine, tax countries, folder structure
- Sprint 7 in Project-Guide: PDF templates + email queue

---

> **Status:** Planning document — **PDF engine: HTML/CSS + Puppeteer/Playwright (recommended)**  
> **Next step:** Implement Phase PDF-1 with HTML template + PDF worker container (Sprint 3–4)
