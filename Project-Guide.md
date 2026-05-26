# Business Accounting & Billing SaaS — Senior Architecture Guide

> **Modelled after Refrens** — a production-grade, multi-tenant billing platform where every user runs a fully isolated accounting workspace. Tenant isolation, authentication, and RBAC are non-negotiable prerequisites. Nothing else ships until these pass review.

---

## Table of Contents

1. [Architectural Philosophy](#1-architectural-philosophy)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Core Principle: Tenant Isolation](#4-core-principle-tenant-isolation)
5. [Repository Layout](#5-repository-layout)
6. [Database Design Principles](#6-database-design-principles)
   - [Shared pagination package](#shared-pagination-package-packagespagination)
7. [Phase 1 — Auth, Tenant Context & RBAC](#7-phase-1--auth-tenant-context--rbac)
8. [Phase 2 — Master Data](#8-phase-2--master-data)
9. [Phase 3 — Document Engine](#9-phase-3--document-engine)
10. [Phase 4 — Financial Modules](#10-phase-4--financial-modules)
11. [Phase 5 — Country-Based Tax System (India & UAE)](#11-phase-5--country-based-tax-system-india--uae)
12. [Phase 6 — PDF, Email & Notifications](#12-phase-6--pdf-email--notifications)
13. [Phase 7 — Dashboard & Reports](#13-phase-7--dashboard--reports)
14. [Cross-Cutting Systems](#14-cross-cutting-systems)
15. [API Design Patterns](#15-api-design-patterns)
16. [Error Handling Strategy](#16-error-handling-strategy)
17. [Performance & Caching](#17-performance--caching)
18. [Testing Strategy](#18-testing-strategy)
19. [Security Checklist](#19-security-checklist)
20. [Sprint Roadmap](#20-sprint-roadmap)
21. [Future Scope (Post-MVP)](#21-future-scope-post-mvp)

---

## 1. Architectural Philosophy

Before writing a single line of code, internalise these principles. Every architectural decision must be measured against them.

| Principle | Why It Matters |
|-----------|---------------|
| **Tenant-first** | Data isolation is a legal and trust requirement. A single leaked query can destroy the product. |
| **Permissions before features** | Bolting RBAC onto existing routes creates leaky surfaces. It must come first. |
| **Single document engine** | Quotation, invoice, proforma, challan — same schema, different `document_type`. Prevents ~60% schema duplication. |
| **Session-derived context only** | `businessId` is NEVER trusted from the client body. Always resolved from the validated session. |
| **Keyset pagination** | One shared package `@repo/pagination` — every list (invoices, clients, contacts, products…) reuses the same cursor logic, schemas, and React hook. |
| **Fail closed** | A missing permission or tenant context must throw, never silently pass. |
| **Audit everything** | Financial systems have legal accountability requirements. Every mutation is logged. |
| **Country-driven tax** | Business selects **tax country** at setup (MVP: **India**, **UAE/Dubai**). Invoice editor, columns, calculations, and compliance load from that country’s tax provider — not hard-coded GST everywhere. |
| **Domain boundaries** | Code folders **match the sidebar** (`sales-and-invoices`, `purchases-and-expenses`, `sales-crm-and-leads`, etc.) — not generic names like `billing` or a flat `modules/` list. |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15** (App Router) | Server Actions + streaming; strong India-region CDN support via Vercel/AWS |
| Language | **TypeScript** (strict mode) | Eliminate entire classes of bugs at compile time |
| Database | **PostgreSQL 16** | Row-level security available; proven for financial data; JSONB for flexible metadata |
| ORM | **Prisma 5** | Type-safe queries; middleware hooks for tenant injection |
| Auth | **Auth.js v5 (NextAuth)** | Adapter-based; session fully customisable |
| Validation | **Zod** | Runtime + compile-time safety; use for all boundaries (forms, API, env) |
| Forms | **React Hook Form + Zod resolver** | Uncontrolled inputs; minimal re-renders |
| UI Components | **ShadCN UI** (Radix primitives) | Accessible, unstyled base; full design ownership |
| Data Tables | **TanStack Table v8** | Server-side **keyset** pagination, sorting, filtering |
| Cache / Queue | **Redis (Upstash) + BullMQ** | Job queues for PDF generation, emails, reminders |
| File Storage | **AWS S3** (or Cloudflare R2) | Per-tenant key prefixing; pre-signed URLs; no public URLs |
| Email | **Resend + React Email** | Transactional; reliable Indian delivery |
| PDF | **react-pdf** (rendering) + **pdf-lib** (manipulation) | Template-based; mergeable |
| Payments | **Razorpay** (India primary) + **Stripe** (international) | UPI, cards, net banking |
| Monitoring | **Sentry** (errors) + **PostHog** (product analytics) | Separate concerns |
| Deploy | **Docker → AWS ECS or DigitalOcean App Platform** | Container-native; horizontal scaling |
| CI/CD | **GitHub Actions** | Lint → test → build → deploy pipeline |

### Environment validation

Always validate env at startup. Never let a misconfigured deploy reach production silently.

```ts
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AWS_S3_BUCKET: z.string(),
  AWS_REGION: z.string(),
  RESEND_API_KEY: z.string(),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const env = envSchema.parse(process.env);
```

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  Next.js App Router · React Server Components · ShadCN UI      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                      Next.js Server                             │
│                                                                 │
│  middleware.ts ──► Auth check ──► Tenant resolve ──► RBAC      │
│                                                                 │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Server       │  │ Route Handlers  │  │ Background Jobs  │  │
│  │ Actions      │  │ (Webhooks/API)  │  │ (BullMQ workers) │  │
│  └──────┬───────┘  └────────┬────────┘  └────────┬─────────┘  │
│         │                   │                     │            │
│         └──────────────┬────┘                     │            │
│                        ▼                           ▼            │
│              Tenant-scoped Prisma           Redis Queue         │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  PostgreSQL          AWS S3          Resend/
  (primary DB)   (file storage)    Razorpay/Stripe
```

---

## 4. Core Principle: Tenant Isolation

**This is non-negotiable.** One user's data must be invisible and inaccessible to every other user — at the database layer, ORM layer, application layer, and file storage layer.

### Terminology

| Term | Meaning |
|------|---------|
| **Tenant** | A single accounting workspace (`business` record). All operational data belongs to exactly one tenant. |
| **Owner** | User who created the workspace. Full control. Cannot be removed from their own tenant. |
| **Member** | Invited user with a scoped role inside exactly one tenant. |
| **Cross-tenant** | Strictly forbidden. No shared clients, invoices, reports, or files between tenants. |

### Isolation model

```
User signs up
    │
    ├── creates User record
    ├── creates Business record (their isolated workspace)
    └── creates business_users row with role = 'owner'
         │
         └── session.activeBusinessId = business.id

Every query:
    WHERE business_id = session.activeBusinessId
```

One user may later create or be invited into additional businesses. The session always tracks `activeBusinessId`. Never query without it.

### Isolation enforcement layers

| Layer | Mechanism |
|-------|-----------|
| **Database** | `business_id UUID NOT NULL` on every tenant-owned table; indexed |
| **Prisma** | Client extension injects `where: { businessId }` automatically |
| **Server Actions** | `businessId` resolved from session — never from client request body |
| **Middleware** | Protects all `/app/*` routes; redirects unauthenticated users |
| **RBAC** | Permissions checked inside tenant scope |
| **S3** | Keys: `businesses/{businessId}/{module}/{filename}` |
| **Audit logs** | Every log entry carries `business_id` + `user_id` |

```
User A  (Business-1)           User B  (Business-2)
├── clients/                   ├── clients/
├── products/                  ├── products/
├── documents/                 ├── documents/
└── files/ (S3 prefix)         └── files/ (S3 prefix)
        ╳ — NO shared rows — ╳
```

---

## 5. Repository Layout

Use a **monorepo**. Folder and route names **match the sidebar dropdown** (Refrens-style) so navigation, URLs, and code stay aligned.

### Naming rules

| UI label (sidebar) | Folder / route slug | Example URL |
|--------------------|---------------------|---------------|
| Sales & Invoices | `sales-and-invoices` | `/sales-and-invoices/invoices` |
| Clients & Prospects | `clients-and-prospects` | `/sales-and-invoices/clients-and-prospects` |
| Purchases & Expenses | `purchases-and-expenses` | `/purchases-and-expenses/purchase-orders` |
| Sales CRM & Leads | `sales-crm-and-leads` | `/sales-crm-and-leads/leads` |
| Products & Inventory | `products-and-inventory` | `/products-and-inventory/products` |
| Business Settings | `business-settings` | `/business-settings` |

Use **kebab-case** for all paths. Drop `&` from slugs (`sales-and-invoices`, not `sales-&-invoices`).

### Target structure (aligned to sidebar)

```
root/
├── apps/web/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + business context
│   │   │   │
│   │   │   ├── dashboard/              # Dashboard
│   │   │   │
│   │   │   ├── contacts/               # Contacts
│   │   │   │
│   │   │   ├── sales-and-invoices/     # ▼ Sales & Invoices (dropdown)
│   │   │   │   ├── clients-and-prospects/
│   │   │   │   ├── quotations-and-estimates/
│   │   │   │   ├── proforma-invoices/
│   │   │   │   ├── invoices/
│   │   │   │   ├── payment-receipts/
│   │   │   │   ├── sales-orders/
│   │   │   │   ├── delivery-challans/
│   │   │   │   └── credit-notes/
│   │   │   │
│   │   │   ├── purchases-and-expenses/ # ▼ Purchases & Expenses (dropdown)
│   │   │   │   ├── vendor-leads/
│   │   │   │   ├── vendors-and-suppliers/
│   │   │   │   ├── bills/              # "Purchases & Expenses" line items (avoid duplicate slug)
│   │   │   │   ├── payout-receipts/
│   │   │   │   ├── purchase-orders/
│   │   │   │   ├── debit-notes/
│   │   │   │   └── hire-best-vendors/  # optional / marketing
│   │   │   │
│   │   │   ├── accounting/             # ▼ Accounting (New) — POST-MVP
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── sales-crm-and-leads/    # ▼ Sales CRM & Leads — POST-MVP
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── products-and-inventory/ # ▼ Products & Inventory
│   │   │   │   ├── products/
│   │   │   │   ├── categories/
│   │   │   │   └── stock/              # inventory slice — expand later
│   │   │   │
│   │   │   ├── reports/                # ▼ Reports
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── gst-reports/            # ▼ GST Reports (New) — IN only
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── workflows-and-automations/
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── banking-and-payments/
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── payroll-and-hrms/
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   ├── manage-team/
│   │   │   │   └── .gitkeep
│   │   │   │
│   │   │   └── business-settings/      # Business Settings (gear)
│   │   │       ├── profile/
│   │   │       ├── taxes/
│   │   │       ├── templates/
│   │   │       └── users/
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       └── webhooks/
│   │
│   ├── modules/                        # ★ Same names as app routes (mirror sidebar)
│   │   ├── core/                       # auth, tenants, rbac, audit (not in sidebar)
│   │   ├── shared/
│   │   │   └── documents/              # Single document engine (all document_type values)
│   │   │       ├── engine/
│   │   │       └── editor/             # Shared editor shell
│   │   │
│   │   ├── dashboard/
│   │   ├── contacts/
│   │   │
│   │   ├── sales-and-invoices/
│   │   │   ├── clients-and-prospects/
│   │   │   ├── quotations-and-estimates/
│   │   │   ├── proforma-invoices/
│   │   │   ├── invoices/
│   │   │   ├── payment-receipts/
│   │   │   ├── sales-orders/
│   │   │   ├── delivery-challans/
│   │   │   └── credit-notes/
│   │   │
│   │   ├── purchases-and-expenses/
│   │   │   ├── vendor-leads/
│   │   │   ├── vendors-and-suppliers/
│   │   │   ├── bills/
│   │   │   ├── payout-receipts/
│   │   │   ├── purchase-orders/
│   │   │   └── debit-notes/
│   │   │
│   │   ├── accounting/
│   │   ├── sales-crm-and-leads/
│   │   ├── products-and-inventory/
│   │   ├── reports/
│   │   ├── gst-reports/
│   │   ├── workflows-and-automations/
│   │   ├── banking-and-payments/
│   │   ├── payroll-and-hrms/
│   │   ├── manage-team/
│   │   └── business-settings/
│   │
│   ├── lib/                            # auth, tenant, rbac, db, env (no per-feature pagination)
│   ├── config/
│   │   └── navigation.ts               # Full sidebar tree (labels + slugs + RBAC)
│   └── middleware.ts
│
├── packages/
│   ├── pagination/                     # ★ SHARED — keyset paginate (all list screens)
│   │   └── src/
│   │       ├── schemas.ts
│   │       ├── cursor.ts
│   │       ├── keyset-paginate.ts
│   │       ├── sort-presets.ts
│   │       ├── types.ts
│   │       └── react/use-keyset-infinite-query.ts
│   ├── ui/
│   ├── validations/
│   ├── calculations/
│   ├── tax/
│   ├── database/prisma/models/
│   │   ├── core/
│   │   ├── contacts/
│   │   ├── sales-and-invoices/         # documents, clients, payments-in
│   │   ├── purchases-and-expenses/     # vendors, bills, payments-out
│   │   ├── products-and-inventory/
│   │   ├── accounting/
│   │   ├── sales-crm-and-leads/
│   │   ├── gst-reports/
│   │   └── ...
│   └── types/
│
├── docker-compose.yml
└── turbo.json
```

### Sidebar → folder map (full tree)

| # | Sidebar (parent) | Sub-items (dropdown) | `app/` + `modules/` folder |
|---|------------------|----------------------|----------------------------|
| 1 | **Dashboard** | — | `dashboard/` |
| 2 | **Contacts** | — | `contacts/` |
| 3 | **Sales & Invoices** | Clients & Prospects | `sales-and-invoices/clients-and-prospects/` |
| | | Quotation & Estimates | `sales-and-invoices/quotations-and-estimates/` |
| | | Proforma Invoices | `sales-and-invoices/proforma-invoices/` |
| | | Invoices | `sales-and-invoices/invoices/` |
| | | Payment Receipts | `sales-and-invoices/payment-receipts/` |
| | | Sales Orders | `sales-and-invoices/sales-orders/` |
| | | Delivery Challans | `sales-and-invoices/delivery-challans/` |
| | | Credit Notes | `sales-and-invoices/credit-notes/` |
| 4 | **Purchases & Expenses** | Vendor Leads | `purchases-and-expenses/vendor-leads/` |
| | | Vendors & Suppliers | `purchases-and-expenses/vendors-and-suppliers/` |
| | | Purchases & Expenses | `purchases-and-expenses/bills/` |
| | | Payout Receipts | `purchases-and-expenses/payout-receipts/` |
| | | Purchase Orders | `purchases-and-expenses/purchase-orders/` |
| | | Debit Notes | `purchases-and-expenses/debit-notes/` |
| | | Hire The Best Vendors | `purchases-and-expenses/hire-best-vendors/` |
| 5 | **Accounting** | *(sub-routes TBD)* | `accounting/` |
| 6 | **Sales CRM & Leads** | *(sub-routes TBD)* | `sales-crm-and-leads/` |
| 7 | **Products & Inventory** | *(sub-routes TBD)* | `products-and-inventory/` |
| 8 | **Reports** | *(sub-routes TBD)* | `reports/` |
| 9 | **GST Reports** | *(sub-routes TBD)* | `gst-reports/` |
| 10 | **Workflows & Automations** | *(sub-routes TBD)* | `workflows-and-automations/` |
| 11 | **Banking & Payments** | *(sub-routes TBD)* | `banking-and-payments/` |
| 12 | **Payroll & HRMS** | — | `payroll-and-hrms/` |
| 13 | **Manage Team** | *(sub-routes TBD)* | `manage-team/` |
| 14 | **Business Settings** | profile, taxes, templates, users | `business-settings/` |

> **Note:** UI label *Purchases & Expenses* (expense list) maps to folder `bills/` to avoid `purchases-and-expenses/purchases-and-expenses/`. Display name stays "Purchases & Expenses" in navigation config.

### Shared document engine

All sales and purchase documents use **one** `documents` table (`document_type` enum). Code lives in `modules/shared/documents/`; each sidebar item folder only adds **routes + thin UI**:

```
modules/shared/documents/          # engine, numbering, tax hook, PDF
modules/sales-and-invoices/invoices/   # pages + invoice-specific actions
modules/purchases-and-expenses/purchase-orders/
```

### `config/navigation.ts` (sidebar source of truth)

```ts
// config/navigation.ts

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  permission?: string;
  enabled: boolean;
  badge?: 'new';
  children?: NavItem[];
};

export const sidebarNavigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', permission: 'dashboard.view', enabled: true },
  { id: 'contacts', label: 'Contacts', href: '/contacts', permission: 'contact.view', enabled: true },
  {
    id: 'sales-and-invoices',
    label: 'Sales & Invoices',
    enabled: true,
    children: [
      { id: 'clients-and-prospects', label: 'Clients & Prospects', href: '/sales-and-invoices/clients-and-prospects', permission: 'client.view', enabled: true },
      { id: 'quotations-and-estimates', label: 'Quotation & Estimates', href: '/sales-and-invoices/quotations-and-estimates', permission: 'document.view', enabled: true },
      { id: 'proforma-invoices', label: 'Proforma Invoices', href: '/sales-and-invoices/proforma-invoices', permission: 'document.view', enabled: false },
      { id: 'invoices', label: 'Invoices', href: '/sales-and-invoices/invoices', permission: 'document.view', enabled: true },
      { id: 'payment-receipts', label: 'Payment Receipts', href: '/sales-and-invoices/payment-receipts', permission: 'payment.view', enabled: true },
      { id: 'sales-orders', label: 'Sales Orders', href: '/sales-and-invoices/sales-orders', permission: 'document.view', enabled: false },
      { id: 'delivery-challans', label: 'Delivery Challans', href: '/sales-and-invoices/delivery-challans', permission: 'document.view', enabled: false },
      { id: 'credit-notes', label: 'Credit Notes', href: '/sales-and-invoices/credit-notes', permission: 'document.view', enabled: false },
    ],
  },
  {
    id: 'purchases-and-expenses',
    label: 'Purchases & Expenses',
    enabled: false,
    children: [
      { id: 'vendor-leads', label: 'Vendor Leads', href: '/purchases-and-expenses/vendor-leads', permission: 'vendor.view', enabled: false },
      { id: 'vendors-and-suppliers', label: 'Vendors & Suppliers', href: '/purchases-and-expenses/vendors-and-suppliers', permission: 'vendor.view', enabled: false },
      { id: 'bills', label: 'Purchases & Expenses', href: '/purchases-and-expenses/bills', permission: 'bill.view', enabled: false },
      { id: 'payout-receipts', label: 'Payout Receipts', href: '/purchases-and-expenses/payout-receipts', permission: 'payout.view', enabled: false },
      { id: 'purchase-orders', label: 'Purchase Orders', href: '/purchases-and-expenses/purchase-orders', permission: 'document.view', enabled: false },
      { id: 'debit-notes', label: 'Debit Notes', href: '/purchases-and-expenses/debit-notes', permission: 'document.view', enabled: false },
    ],
  },
  { id: 'accounting', label: 'Accounting', href: '/accounting', permission: 'accounting.view', enabled: false, badge: 'new' },
  { id: 'sales-crm-and-leads', label: 'Sales CRM & Leads', href: '/sales-crm-and-leads', permission: 'crm.view', enabled: false },
  { id: 'products-and-inventory', label: 'Products & Inventory', href: '/products-and-inventory/products', permission: 'product.view', enabled: true },
  { id: 'reports', label: 'Reports', href: '/reports', permission: 'report.view', enabled: false },
  { id: 'gst-reports', label: 'GST Reports', href: '/gst-reports', permission: 'gst.report.view', enabled: false, badge: 'new' },
  { id: 'workflows-and-automations', label: 'Workflows & Automations', href: '/workflows-and-automations', permission: 'workflow.view', enabled: false },
  { id: 'banking-and-payments', label: 'Banking & Payments', href: '/banking-and-payments', permission: 'banking.view', enabled: false, badge: 'new' },
  { id: 'payroll-and-hrms', label: 'Payroll & HRMS', href: '/payroll-and-hrms', permission: 'payroll.view', enabled: false, badge: 'new' },
  { id: 'manage-team', label: 'Manage Team', href: '/manage-team', permission: 'team.view', enabled: false, badge: 'new' },
  { id: 'business-settings', label: 'Business Settings', href: '/business-settings', permission: 'settings.view', enabled: true },
];
```

Set `enabled: true` per item as each feature ships. Sidebar component renders this tree recursively.

### MVP vs later (from sidebar)

| MVP (build first) | Later (`enabled: false` in nav) |
|-------------------|----------------------------------|
| Dashboard, Contacts | Accounting, GST Reports |
| Sales & Invoices: clients, quotations, invoices, payment receipts | Proforma, sales orders, challans, credit notes |
| Products & Inventory (products only) | Full stock, purchases dropdown, CRM |
| Business Settings | Banking, Payroll, Workflows, Manage Team |

### Co-located actions (per sidebar item)

```
modules/sales-and-invoices/invoices/
  ├── invoice.actions.ts          # listInvoices → keysetPaginate from @repo/pagination
  ├── components/
  └── hooks/use-invoice-list.ts   # useKeysetInfiniteQuery from @repo/pagination/react

packages/pagination/              # ★ shared — NOT duplicated per module

modules/shared/documents/
  ├── document.service.ts
  ├── list-documents.ts           # optional factory for all document_type lists
  └── document-number.service.ts
```

**Convention:** Routes in `app/(dashboard)/...`; business logic in `modules/<same-path>/`. **Pagination always from `@repo/pagination`.**

### Prisma model folders (match sidebar domains)

| Prisma folder | Tables (examples) |
|---------------|-------------------|
| `models/core/` | users, businesses, roles |
| `models/contacts/` | contacts, contact_links |
| `models/sales-and-invoices/` | clients, documents (sales types), payments |
| `models/purchases-and-expenses/` | vendors, bills, payout_receipts |
| `models/products-and-inventory/` | products, categories, stock |
| `models/sales-crm-and-leads/` | leads, pipeline_stages |
| `models/accounting/` | chart_of_accounts, journal_entries |

---

## 6. Database Design Principles

### Universal conventions

Every table in the system follows these rules without exception:

```prisma
// Every tenant-owned table has:
id         String   @id @default(uuid()) @db.Uuid
businessId String   @map("business_id") @db.Uuid
business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
createdAt  DateTime @default(now()) @map("created_at")
updatedAt  DateTime @updatedAt @map("updated_at")
deletedAt  DateTime? @map("deleted_at")  // soft delete on operational tables

@@index([businessId])
@@index([businessId, createdAt, id])   // keyset pagination (sort + tie-breaker)
```

### Keyset pagination (mandatory for lists)

Use **keyset (seek) pagination** — not offset/`skip` — for all tenant-owned list endpoints (invoices, clients, products, documents, contacts, audit logs).

| Approach | Query shape | Problem on large tables |
|----------|-------------|-------------------------|
| **Offset** | `OFFSET 50000 LIMIT 20` | Scans/skips rows; slow and unstable if rows insert/delete while paging |
| **Keyset** | `WHERE (created_at, id) < ($cursorTs, $cursorId) ORDER BY created_at DESC, id DESC LIMIT 20` | Constant time with index; stable pages |

**Rules:**

1. Always filter by `businessId` first (tenant isolation).
2. Always use a **unique tie-breaker**: composite sort `(sortField, id)` — never sort by `createdAt` alone.
3. Default sort: `createdAt DESC, id DESC` (newest first).
4. Max page size: **50** (default **20**); reject larger `limit` values.
5. Cursor is **opaque** to the client (base64url JSON or signed string) — encodes sort field values + `id`, not raw SQL.
6. Do not support random page jumps (page 47) in MVP — **Next / Previous** only. Offset is allowed only for tiny static lists (under 500 rows total) if ever needed.

**Indexes** (required per list table):

```sql
-- Default list (newest first)
CREATE INDEX idx_documents_business_created_id
  ON documents(business_id, created_at DESC, id DESC);

-- Filtered list (e.g. status = SENT)
CREATE INDEX idx_documents_business_status_created_id
  ON documents(business_id, status, created_at DESC, id DESC);
```

In Prisma schema:

```prisma
@@index([businessId, createdAt, id])
@@index([businessId, status, createdAt, id])
```

### Shared pagination package (`packages/pagination`)

**Do not copy pagination logic into each module.** All list Server Actions and list UIs import from `@repo/pagination`.

#### Package layout

```text
packages/pagination/
├── package.json                    # name: "@repo/pagination"
├── tsconfig.json
└── src/
    ├── index.ts                    # re-exports public API
    ├── types.ts                    # PaginatedResponse<T>, PageInfo, KeysetSort
    ├── schemas.ts                  # paginationInputSchema, paginatedResponseSchema
    ├── cursor.ts                   # encodeCursor / decodeCursor (generic sort keys + id)
    ├── sort-presets.ts             # DEFAULT_SORT, SORT_ALLOWLIST per resource
    ├── keyset-paginate.ts          # keysetPaginate() — single Prisma list implementation
    └── react/
        └── use-keyset-infinite-query.ts
```

#### Public API (import everywhere)

```ts
// Server (Server Actions, services)
import {
  paginationInputSchema,
  keysetPaginate,
  type PaginatedResponse,
  type PaginationInput,
} from '@repo/pagination';

// Client (list pages, TanStack Table)
import { useKeysetInfiniteQuery } from '@repo/pagination/react';
```

#### Reuse in every sidebar section

Each feature only supplies **what is unique**: `where`, `select`, optional filters. Pagination is always the same.

| Sidebar / module | List action file | Extends `paginationInputSchema` with |
|----------------|------------------|--------------------------------------|
| Contacts | `modules/contacts/contact.actions.ts` → `listContacts` | `search?` |
| Clients & Prospects | `modules/sales-and-invoices/clients-and-prospects/client.actions.ts` → `listClients` | `search?`, `status?` |
| Invoices | `modules/sales-and-invoices/invoices/invoice.actions.ts` → `listInvoices` | `status?`, `clientId?` |
| Quotation & Estimates | `modules/.../quotations-and-estimates/quotation.actions.ts` → `listQuotations` | `status?` |
| Proforma Invoices | `modules/.../proforma-invoices/` → `listProformas` | `status?` |
| Payment Receipts | `modules/.../payment-receipts/` → `listPayments` | `method?`, `dateFrom?` |
| Sales Orders | `modules/.../sales-orders/` → `listSalesOrders` | `status?` |
| Delivery Challans | `modules/.../delivery-challans/` → `listChallans` | `status?` |
| Credit Notes | `modules/.../credit-notes/` → `listCreditNotes` | `status?` |
| Products | `modules/products-and-inventory/products/` → `listProducts` | `categoryId?`, `search?` |
| Vendors | `modules/purchases-and-expenses/vendors-and-suppliers/` → `listVendors` | `search?` |
| Purchase Orders | `modules/.../purchase-orders/` → `listPurchaseOrders` | `status?` |
| Bills / Expenses | `modules/.../bills/` → `listBills` | `status?` |
| Audit (admin) | `modules/core/audit/` → `listAuditLogs` | `action?`, `userId?` |
| Manage Team | `modules/manage-team/` → `listTeamMembers` | small list — still use shared helper |

**Rule:** If it is a table with more than one screen of rows → `keysetPaginate` from `@repo/pagination`.

#### Server Action pattern (copy-paste shape per module)

```ts
// modules/sales-and-invoices/invoices/invoice.actions.ts
'use server';

import { paginationInputSchema, keysetPaginate } from '@repo/pagination';
import { z } from 'zod';

export const listInvoicesSchema = paginationInputSchema.extend({
  status: z.enum(['DRAFT', 'SENT', 'PAID', /* ... */]).optional(),
  clientId: z.string().uuid().optional(),
});

export async function listInvoices(input: z.infer<typeof listInvoicesSchema>) {
  const session = await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const { cursor, limit, status, clientId } = listInvoicesSchema.parse(input);

  return keysetPaginate({
    model: prisma.document,
    where: {
      businessId: session.activeBusinessId,
      documentType: 'INVOICE',
      deletedAt: null,
      ...(status && { status }),
      ...(clientId && { clientId }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor,
    limit,
    select: invoiceListSelect,  // defined once per module — slim columns only
  });
}
```

Other document types (`listQuotations`, `listCreditNotes`, …) are the **same call** with different `documentType` and `select` — consider a thin factory:

```ts
// modules/shared/documents/list-documents.ts
export function listDocumentsByType(type: DocumentType, input: ListDocumentsInput) {
  return keysetPaginate({ /* shared where + documentType */ });
}
```

#### Client hook pattern (same in every list page)

```ts
// packages/pagination/src/react/use-keyset-infinite-query.ts

export function useKeysetInfiniteQuery<T>(options: {
  queryKey: unknown[];
  queryFn: (cursor?: string) => Promise<PaginatedResponse<T>>;
}) {
  return useInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: ({ pageParam }) => options.queryFn(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.nextCursor ?? undefined,
  });
}
```

```ts
// modules/sales-and-invoices/invoices/hooks/use-invoice-list.ts
import { useKeysetInfiniteQuery } from '@repo/pagination/react';
import { listInvoices } from '../invoice.actions';

export function useInvoiceList(filters: InvoiceListFilters) {
  return useKeysetInfiniteQuery({
    queryKey: ['invoices', filters],
    queryFn: (cursor) => listInvoices({ ...filters, cursor }),
  });
}
```

Reuse the same hook for clients, products, contacts — only `queryKey`, `queryFn`, and filters change.

#### Shared UI component (optional)

```text
packages/ui/src/data-table/
  ├── keyset-data-table.tsx     # TanStack Table + Load more / infinite scroll
  └── list-page-shell.tsx       # title, filters slot, table slot
```

Every list page:

```tsx
<KeysetDataTable
  columns={invoiceColumns}
  query={useInvoiceList(filters)}
  emptyState={<EmptyInvoices />}
/>
```

#### `package.json` dependency

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/pagination": "workspace:*"
  }
}
```

### Why soft delete?

Financial records must never be hard deleted. A deleted invoice may be referenced by a payment, a credit note, or an audit trail. Mark deleted, filter in queries, but keep the row.

### UUID strategy

Use `uuid()` (v4) for all PKs. Never use auto-increment integers — they leak row counts and can be enumerated by attackers.

### Standard indexes

```sql
-- Add on every tenant table:
CREATE INDEX idx_{table}_business_id ON {table}(business_id);
CREATE INDEX idx_{table}_business_status ON {table}(business_id, status);
CREATE INDEX idx_{table}_business_created_id ON {table}(business_id, created_at DESC, id DESC);

-- For document lookups:
CREATE UNIQUE INDEX idx_documents_number ON documents(business_id, document_number, document_type);
```

---

## 7. Phase 1 — Auth, Tenant Context & RBAC

**This is Sprint 1. Do not proceed to Phase 2 until every item in the Definition of Done is checked.**

### 7.1 Authentication (Auth.js v5)

#### Database tables

```prisma
// packages/database/prisma/models/auth.prisma

model User {
  id            String    @id @default(uuid()) @db.Uuid
  name          String?
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  passwordHash  String?   @map("password_hash")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  accounts      Account[]
  sessions      Session[]
  businessUsers BusinessUser[]

  @@map("users")
}

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid()) @db.Uuid
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id") @db.Uuid
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([token])
  @@map("password_reset_tokens")
}
```

#### Session payload

```ts
// lib/auth/session.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
    };
    activeBusinessId: string;
    roleId: string;
    permissions: string[];  // pre-loaded; avoids per-request DB hits
  }
}
```

**Pre-load permissions into the session on login.** This avoids a DB round-trip on every authenticated request.

#### Registration flow

```ts
// actions/auth.actions.ts
export async function register(input: RegisterInput) {
  const parsed = registerSchema.parse(input);

  return await prisma.$transaction(async (tx) => {
    // 1. Hash password
    const passwordHash = await bcrypt.hash(parsed.password, 12);

    // 2. Create user
    const user = await tx.user.create({
      data: { email: parsed.email, name: parsed.name, passwordHash },
    });

    // 3. Create default business — tax country drives entire tax system (MVP: IN | AE)
    const taxCountry = parsed.taxCountry ?? 'IN'; // 'IN' = India, 'AE' = UAE (Dubai)
    const business = await tx.business.create({
      data: {
        name: parsed.businessName ?? `${parsed.name}'s Business`,
        taxCountry,
        country: taxCountry,
        currency: taxCountry === 'AE' ? 'AED' : 'INR',
      },
    });
    // Seed default tax rates + field/column profile for taxCountry (see Phase 5)
    await seedTaxProfileForBusiness(tx, business.id, taxCountry);

    // 4. Assign owner role
    const ownerRole = await tx.role.findFirstOrThrow({
      where: { slug: 'owner', isSystem: true },
    });

    await tx.businessUser.create({
      data: {
        userId: user.id,
        businessId: business.id,
        roleId: ownerRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    // 5. Create audit log
    await tx.auditLog.create({
      data: {
        businessId: business.id,
        userId: user.id,
        action: 'BUSINESS_CREATED',
        metadata: { businessName: business.name },
      },
    });

    return { userId: user.id, businessId: business.id };
  });
}
```

### 7.2 Tenant / Business

```prisma
// packages/database/prisma/models/tenant.prisma

model Business {
  id          String     @id @default(uuid()) @db.Uuid
  name        String
  legalName   String?    @map("legal_name")

  // Tax country — which system loads on invoices (MVP: IN, AE)
  taxCountry    TaxCountry @default(IN) @map("tax_country")

  // India-specific
  gstin       String?
  pan         String?
  stateCode   String?    @map("state_code")  // GST state code

  // UAE-specific (Dubai / Emirates)
  trn         String?    // Tax Registration Number (15 digits)
  emirate     String?    // e.g. "Dubai", "Abu Dhabi"

  email       String?
  phone       String?
  address     String?
  city        String?
  state       String?
  country     String     @default("IN")  // ISO 3166-1 alpha-2 (same as taxCountry for MVP)
  pincode     String?
  currency    String     @default("INR")  // INR for IN, AED for AE
  logoUrl     String?    @map("logo_url")
  settings    Json       @default("{}")  // theme, invoice prefix, fiscal year, etc.
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  users       BusinessUser[]
  clients     Client[]
  products    Product[]
  documents   Document[]
  // ... all tenant-owned relations

  @@index([taxCountry])
  @@map("businesses")
}

enum TaxCountry {
  IN   // India — GST (CGST / SGST / IGST)
  AE   // United Arab Emirates — VAT (incl. Dubai)
}

model BusinessUser {
  id         String            @id @default(uuid()) @db.Uuid
  businessId String            @map("business_id") @db.Uuid
  userId     String            @map("user_id") @db.Uuid
  roleId     String            @map("role_id") @db.Uuid
  status     BusinessUserStatus @default(PENDING)
  invitedAt  DateTime?         @map("invited_at")
  joinedAt   DateTime?         @map("joined_at")
  createdAt  DateTime          @default(now()) @map("created_at")

  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role     @relation(fields: [roleId], references: [id])

  @@unique([businessId, userId])
  @@index([businessId])
  @@index([userId])
  @@map("business_users")
}

enum BusinessUserStatus {
  PENDING
  ACTIVE
  SUSPENDED
  REMOVED
}
```

### 7.3 RBAC

#### Database tables

```prisma
// packages/database/prisma/models/rbac.prisma

model Role {
  id          String   @id @default(uuid()) @db.Uuid
  businessId  String?  @map("business_id") @db.Uuid  // null = system template
  name        String
  slug        String
  description String?
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")

  business       Business?        @relation(fields: [businessId], references: [id], onDelete: Cascade)
  rolePermissions RolePermission[]
  businessUsers  BusinessUser[]

  @@unique([businessId, slug])
  @@map("roles")
}

model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique  // e.g. "invoice.create"
  module      String            // e.g. "invoice"
  action      String            // e.g. "create"
  description String?

  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String @map("role_id") @db.Uuid
  permissionId String @map("permission_id") @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

#### Permission catalog

```ts
// lib/rbac/permissions.ts

export const PERMISSIONS = {
  // Clients
  CLIENT_CREATE:  'client.create',
  CLIENT_VIEW:    'client.view',
  CLIENT_EDIT:    'client.edit',
  CLIENT_DELETE:  'client.delete',

  // Products
  PRODUCT_CREATE: 'product.create',
  PRODUCT_VIEW:   'product.view',
  PRODUCT_EDIT:   'product.edit',
  PRODUCT_DELETE: 'product.delete',

  // Quotations
  QUOTATION_CREATE:  'quotation.create',
  QUOTATION_VIEW:    'quotation.view',
  QUOTATION_EDIT:    'quotation.edit',
  QUOTATION_DELETE:  'quotation.delete',
  QUOTATION_APPROVE: 'quotation.approve',
  QUOTATION_SEND:    'quotation.send',

  // Invoices
  INVOICE_CREATE:  'invoice.create',
  INVOICE_VIEW:    'invoice.view',
  INVOICE_EDIT:    'invoice.edit',
  INVOICE_DELETE:  'invoice.delete',
  INVOICE_SEND:    'invoice.send',
  INVOICE_CANCEL:  'invoice.cancel',

  // Payments
  PAYMENT_RECORD: 'payment.record',
  PAYMENT_VIEW:   'payment.view',
  PAYMENT_DELETE: 'payment.delete',

  // Reports
  REPORT_VIEW:   'report.view',
  REPORT_EXPORT: 'report.export',

  // Settings
  SETTINGS_BUSINESS: 'settings.business',
  SETTINGS_USERS:    'settings.users',
  SETTINGS_ROLES:    'settings.roles',
  SETTINGS_TAXES:    'settings.taxes',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Default role → permissions mapping (seeded at startup)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.CLIENT_CREATE, PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_DELETE,
    PERMISSIONS.PRODUCT_CREATE, PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_EDIT, PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.QUOTATION_CREATE, PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.QUOTATION_EDIT, PERMISSIONS.QUOTATION_DELETE,
    PERMISSIONS.QUOTATION_APPROVE, PERMISSIONS.QUOTATION_SEND,
    PERMISSIONS.INVOICE_CREATE, PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_EDIT, PERMISSIONS.INVOICE_SEND,
    PERMISSIONS.PAYMENT_RECORD, PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SETTINGS_TAXES,
  ],
  accountant: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.INVOICE_VIEW, PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_EDIT, PERMISSIONS.INVOICE_SEND,
    PERMISSIONS.PAYMENT_RECORD, PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT,
  ],
  viewer: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.QUOTATION_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
};
```

#### Permission check helpers

```ts
// lib/rbac/check.ts
import { auth } from '@/lib/auth/config';

export async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('UNAUTHENTICATED');
  if (!session.activeBusinessId) throw new Error('NO_ACTIVE_BUSINESS');
  return session;
}

export function can(
  permissions: string[],
  permission: Permission
): boolean {
  return permissions.includes(permission);
}

export async function requirePermission(permission: Permission) {
  const session = await getSessionOrThrow();
  if (!can(session.permissions, permission)) {
    throw new Error(`FORBIDDEN: missing ${permission}`);
  }
  return session;
}

// Usage in a Server Action:
// const session = await requirePermission(PERMISSIONS.INVOICE_CREATE);
// const { activeBusinessId, user } = session;
```

#### Tenant-scoped Prisma extension

```ts
// lib/tenant/prisma-extension.ts
import { PrismaClient } from '@prisma/client';

const TENANT_MODELS = [
  'client', 'product', 'document', 'documentItem',
  'payment', 'file', 'auditLog',
  // add every tenant-owned model here
] as const;

export function createTenantClient(businessId: string) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            args.where = { ...args.where, businessId };
          }
          return query(args);
        },
        async findFirst({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            args.where = { ...args.where, businessId };
          }
          return query(args);
        },
        async findUnique({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            // findUnique → findFirst with businessId guard
            const result = await (prisma as any)[model].findFirst({
              ...args,
              where: { ...args.where, businessId },
            });
            return result;
          }
          return query(args);
        },
        async create({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            args.data = { ...args.data, businessId };
          }
          return query(args);
        },
        async update({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            args.where = { ...args.where, businessId };
          }
          return query(args);
        },
        async delete({ args, query, model }) {
          if (TENANT_MODELS.includes(model as any)) {
            // Prefer soft delete; hard delete guarded by businessId
            args.where = { ...args.where, businessId };
          }
          return query(args);
        },
      },
    },
  });
}
```

### 7.4 Middleware

```ts
// middleware.ts
import { auth } from '@/lib/auth/config';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAppRoute = req.nextUrl.pathname.startsWith('/app');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') ||
                      req.nextUrl.pathname.startsWith('/register');

  if (isAppRoute && !isAuthenticated) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }

  if (isAuthRoute && isAuthenticated) {
    return Response.redirect(new URL('/app/dashboard', req.nextUrl));
  }
});

export const config = {
  matcher: ['/app/:path*', '/login', '/register'],
};
```

### 7.5 Phase 1 — Definition of Done

- [ ] Register creates `user` + `business` + `business_users` (owner) in one transaction
- [ ] Session carries `activeBusinessId`, `roleId`, `permissions[]`
- [ ] `requirePermission()` returns 403 for missing permissions
- [ ] Tenant-scoped Prisma extension injects `businessId` on all query types
- [ ] Accessing another tenant's resource by UUID returns 404/403 (IDOR test)
- [ ] Invite flow: invited user joins only the inviting business
- [ ] Password reset token expires after 1 hour and is single-use
- [ ] Audit log stub writes `user_id`, `business_id`, `action`, `metadata` on every mutation
- [ ] Middleware blocks all `/app/*` routes without a valid session
- [ ] E2E test: User A cannot read User B's data under any condition

---

## 8. Phase 2 — Master Data

Build only after Phase 1 passes isolation review.

### 8.1 Clients

Client tax fields depend on the **business’s `taxCountry`** (UI shows GSTIN/PAN for India, TRN for UAE). Same `clients` table; optional fields left null when not applicable.

```prisma
model Client {
  id            String   @id @default(uuid()) @db.Uuid
  businessId    String   @map("business_id") @db.Uuid
  name          String
  email         String?
  phone         String?
  gstin         String?  // IN
  pan           String?  // IN
  trn           String?  // AE — client TRN when B2B
  taxTreatment  TaxTreatment @default(REGISTERED) @map("tax_treatment")
  addressLine1  String?  @map("address_line_1")
  addressLine2  String?  @map("address_line_2")
  city          String?
  state         String?
  stateCode     String?  @map("state_code")  // GST state code
  country       String   @default("IN")
  pincode       String?
  currency      String   @default("INR")
  notes         String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  business  Business   @relation(fields: [businessId], references: [id], onDelete: Cascade)
  contacts  Contact[]
  documents Document[]

  @@index([businessId])
  @@index([businessId, gstin])
  @@map("clients")
}

enum TaxTreatment {
  REGISTERED        // Has GSTIN
  UNREGISTERED      // No GSTIN (B2C)
  COMPOSITION       // Composition dealer
  CONSUMER          // End consumer
  OVERSEAS          // Export / import
  SEZ_WITH_PAY      // SEZ with payment
  SEZ_WITHOUT_PAY   // SEZ without payment
}
```

### 8.2 Products & Services

```prisma
model Product {
  id          String   @id @default(uuid()) @db.Uuid
  businessId  String   @map("business_id") @db.Uuid
  name        String
  description String?
  sku         String?
  type        ProductType @default(SERVICE)
  unit        String?  // pcs, kg, hrs, etc.
  hsn         String?  // HSN/SAC code for GST
  sac         String?
  price       Decimal  @db.Decimal(12, 2)
  taxRateId   String?  @map("tax_rate_id") @db.Uuid
  categoryId  String?  @map("category_id") @db.Uuid
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  business  Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  taxRate   TaxRate?  @relation(fields: [taxRateId], references: [id])
  category  Category? @relation(fields: [categoryId], references: [id])

  @@index([businessId])
  @@map("products")
}

model TaxRate {
  id         String     @id @default(uuid()) @db.Uuid
  businessId String     @map("business_id") @db.Uuid
  taxCountry TaxCountry @map("tax_country")  // must match business.taxCountry
  name       String     // e.g. "GST 18%" (IN) or "VAT 5%" (AE)
  rate       Decimal    @db.Decimal(5, 2)
  type       TaxType    @default(GST)
  cgst       Decimal?   @db.Decimal(5, 2)  // IN only: half of rate intra-state
  sgst       Decimal?   @db.Decimal(5, 2)  // IN only
  igst       Decimal?   @db.Decimal(5, 2)  // IN only: inter-state
  isDefault  Boolean    @default(false) @map("is_default")

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  products Product[]

  @@index([businessId, taxCountry])
  @@map("tax_rates")
}

enum ProductType { PRODUCT SERVICE }
enum TaxType { GST IGST VAT ZERO EXEMPT NIL }
```

---

## 9. Phase 3 — Document Engine

**Single engine for all document types.** This is the most important architectural decision in the system.

### Why one engine?

Quotation → Sales Order → Invoice → Receipt is a workflow chain. Each document may reference its parent. A unified schema makes conversion trivial — you're updating a `document_type` and status, not migrating rows between tables. It also means all business logic (numbering, calculations, PDF templates, email sending) is written once.

**Tax on documents:** Each invoice uses the business’s `taxCountry`. The editor loads that country’s tax UI (GST vs VAT), line columns, and calculator. `documents.taxCountry` is snapshotted on save so reports stay correct if the business ever changes country (discouraged in MVP).

### Document schema

```prisma
model Document {
  id               String         @id @default(uuid()) @db.Uuid
  businessId       String         @map("business_id") @db.Uuid
  documentNumber   String         @map("document_number")
  documentType     DocumentType   @map("document_type")
  status           DocumentStatus @default(DRAFT)
  clientId         String?        @map("client_id") @db.Uuid
  parentDocumentId String?        @map("parent_document_id") @db.Uuid

  // Dates
  issueDate        DateTime  @map("issue_date")
  dueDate          DateTime? @map("due_date")
  validUntil       DateTime? @map("valid_until")  // quotation expiry

  // Financials (always store final computed values)
  subtotal         Decimal   @db.Decimal(14, 2)
  discountAmount   Decimal   @default(0) @map("discount_amount") @db.Decimal(14, 2)
  taxableAmount    Decimal   @map("taxable_amount") @db.Decimal(14, 2)
  cgstAmount       Decimal   @default(0) @map("cgst_amount") @db.Decimal(14, 2)
  sgstAmount       Decimal   @default(0) @map("sgst_amount") @db.Decimal(14, 2)
  igstAmount       Decimal   @default(0) @map("igst_amount") @db.Decimal(14, 2)
  cessAmount       Decimal   @default(0) @map("cess_amount") @db.Decimal(14, 2)
  totalAmount      Decimal   @map("total_amount") @db.Decimal(14, 2)
  paidAmount       Decimal   @default(0) @map("paid_amount") @db.Decimal(14, 2)
  balanceAmount    Decimal   @map("balance_amount") @db.Decimal(14, 2)

  // Tax country snapshot (from business at issue time — drives which calculator ran)
  taxCountry       TaxCountry @default(IN) @map("tax_country")

  // India GST metadata (null / unused when taxCountry = AE)
  placeOfSupply    String?   @map("place_of_supply")  // state code
  isIgst           Boolean   @default(false) @map("is_igst")
  reverseCharge    Boolean   @default(false) @map("reverse_charge")

  // Normalised tax breakdown (all countries) — VAT lines for AE, GST summary for IN
  taxBreakdown     Json?     @map("tax_breakdown")

  // Snapshot: client address at time of document creation
  clientSnapshot   Json?     @map("client_snapshot")

  // Misc
  currency         String    @default("INR")
  exchangeRate     Decimal   @default(1) @map("exchange_rate") @db.Decimal(10, 6)
  notes            String?
  termsConditions  String?   @map("terms_conditions")
  templateId       String?   @map("template_id") @db.Uuid
  createdBy        String    @map("created_by") @db.Uuid
  updatedBy        String?   @map("updated_by") @db.Uuid
  sentAt           DateTime? @map("sent_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  cancelledAt      DateTime? @map("cancelled_at")

  business        Business       @relation(fields: [businessId], references: [id], onDelete: Cascade)
  client          Client?        @relation(fields: [clientId], references: [id])
  parentDocument  Document?      @relation("DocumentChain", fields: [parentDocumentId], references: [id])
  childDocuments  Document[]     @relation("DocumentChain")
  items           DocumentItem[]
  payments        PaymentAllocation[]

  @@unique([businessId, documentNumber, documentType])
  @@index([businessId])
  @@index([businessId, documentType, status])
  @@index([businessId, clientId])
  @@index([businessId, dueDate])
  @@map("documents")
}

model DocumentItem {
  id           String   @id @default(uuid()) @db.Uuid
  documentId   String   @map("document_id") @db.Uuid
  productId    String?  @map("product_id") @db.Uuid
  name         String
  description  String?
  hsn          String?
  quantity     Decimal  @db.Decimal(10, 3)
  unit         String?
  rate         Decimal  @db.Decimal(12, 2)
  discount     Decimal  @default(0) @db.Decimal(5, 2)  // percentage
  taxRate      Decimal  @default(0) @map("tax_rate") @db.Decimal(5, 2)
  cgst         Decimal  @default(0) @db.Decimal(10, 2)
  sgst         Decimal  @default(0) @db.Decimal(10, 2)
  igst         Decimal  @default(0) @db.Decimal(10, 2)
  amount       Decimal  @db.Decimal(14, 2)
  sortOrder    Int      @default(0) @map("sort_order")

  document Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  product  Product?  @relation(fields: [productId], references: [id])

  @@index([documentId])
  @@map("document_items")
}

enum DocumentType {
  QUOTATION
  SALES_ORDER
  PROFORMA
  DELIVERY_CHALLAN
  INVOICE
  CREDIT_NOTE
  DEBIT_NOTE
  RECEIPT
  PURCHASE_ORDER
  BILL
  EXPENSE
}

enum DocumentStatus {
  DRAFT
  SENT
  VIEWED         // email tracking
  PENDING
  APPROVED
  REJECTED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  CONVERTED      // quotation → invoice
}
```

### Document workflow

```
Quotation (DRAFT → SENT → APPROVED)
    │
    └── Sales Order (via parent_document_id)
          │
          └── Delivery Challan
                │
                └── Invoice (DRAFT → SENT → PARTIALLY_PAID → PAID)
                      │
                      ├── Credit Note (returns/adjustments)
                      └── Receipt (payment record)
```

### Document numbering service

```ts
// services/document-number.service.ts

export async function generateDocumentNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
  documentType: DocumentType
): Promise<string> {
  const prefixMap: Record<DocumentType, string> = {
    QUOTATION:       'QT',
    INVOICE:         'INV',
    SALES_ORDER:     'SO',
    DELIVERY_CHALLAN:'DC',
    CREDIT_NOTE:     'CN',
    DEBIT_NOTE:      'DN',
    PROFORMA:        'PRO',
    PURCHASE_ORDER:  'PO',
    BILL:            'BILL',
    EXPENSE:         'EXP',
    RECEIPT:         'REC',
  };

  // Business settings may override the prefix
  const business = await tx.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { settings: true },
  });

  const settings = business.settings as BusinessSettings;
  const prefix = settings.documentPrefixes?.[documentType] ?? prefixMap[documentType];
  const fiscalYear = getFiscalYear(); // e.g. "2425" for FY 2024-25

  // Atomic counter per tenant per type per year
  const lastDoc = await tx.document.findFirst({
    where: { businessId, documentType, documentNumber: { startsWith: `${prefix}-${fiscalYear}-` } },
    orderBy: { createdAt: 'desc' },
    select: { documentNumber: true },
  });

  const lastSeq = lastDoc
    ? parseInt(lastDoc.documentNumber.split('-').pop() ?? '0', 10)
    : 0;

  return `${prefix}-${fiscalYear}-${String(lastSeq + 1).padStart(4, '0')}`;
  // e.g. INV-2425-0001
}
```

---

## 10. Phase 4 — Financial Modules

### 10.1 Payments & Receipts

```prisma
model Payment {
  id              String        @id @default(uuid()) @db.Uuid
  businessId      String        @map("business_id") @db.Uuid
  paymentNumber   String        @map("payment_number")
  amount          Decimal       @db.Decimal(14, 2)
  currency        String        @default("INR")
  paymentDate     DateTime      @map("payment_date")
  method          PaymentMethod
  referenceNumber String?       @map("reference_number")
  bankAccountId   String?       @map("bank_account_id") @db.Uuid
  notes           String?
  createdBy       String        @map("created_by") @db.Uuid
  createdAt       DateTime      @default(now()) @map("created_at")

  business    Business            @relation(fields: [businessId], references: [id], onDelete: Cascade)
  allocations PaymentAllocation[]

  @@index([businessId])
  @@map("payments")
}

// One payment can settle multiple invoices
model PaymentAllocation {
  id         String  @id @default(uuid()) @db.Uuid
  paymentId  String  @map("payment_id") @db.Uuid
  documentId String  @map("document_id") @db.Uuid
  amount     Decimal @db.Decimal(14, 2)

  payment  Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@index([documentId])
  @@map("payment_allocations")
}

enum PaymentMethod {
  CASH UPI NEFT RTGS IMPS CHEQUE CARD BANK_TRANSFER OTHER
}
```

---

## 11. Phase 5 — Country-Based Tax System (India & UAE)

Tax is **not** hard-coded to GST. Each business selects a **tax country** at registration (or in Settings). That choice loads the correct tax engine, invoice columns, validation rules, and PDF labels for every document in that workspace.

### MVP countries

| UI label | `TaxCountry` code | Tax system | Currency | Business ID field |
|----------|-------------------|------------|----------|-------------------|
| **India** | `IN` | GST — CGST / SGST / IGST | INR (₹) | GSTIN, PAN, state code |
| **UAE (Dubai)** | `AE` | VAT — single tax per line | AED (د.إ) | TRN, emirate |

> **Note:** Dubai is a city/emirate inside the UAE. Store country as **`AE`** (ISO code). Use `emirate: "Dubai"` on the business profile for display and future emirate-specific rules.

### How country selection flows into the invoice

```text
Register / Settings
    └── User picks: India  |  UAE (Dubai)
            └── businesses.taxCountry = IN | AE
            └── seedTaxProfileForBusiness() → default tax rates, column set, field defs

Open Invoice Editor
    └── Load business.taxCountry
            └── getTaxProfile(taxCountry)  → columns, Configure Tax drawer, validators
            └── getTaxProvider(taxCountry) → calculateDocument()

Save Invoice
    └── documents.taxCountry = business.taxCountry (snapshot)
    └── taxBreakdown JSON + cgst/sgst/igst columns (IN) or vat in breakdown (AE)
```

**Rule:** Never let the client send `taxCountry` without verifying it matches `business.taxCountry` (MVP: business country is fixed after setup; changing country later is a separate migration flow).

### Tax provider pattern (Strategy)

```text
packages/tax/
├── index.ts                 # getTaxProvider(country), getTaxProfile(country)
├── types.ts                 # TaxContext, TaxCalculationResult, TaxProfile
├── providers/
│   ├── india-gst.provider.ts
│   └── uae-vat.provider.ts
├── profiles/
│   ├── india.profile.ts     # default columns, fields, seed rates
│   └── uae.profile.ts
└── seed/
    └── seed-tax-profile.ts  # called on business create
```

```ts
// packages/tax/index.ts

export interface TaxProvider {
  country: TaxCountry;
  calculate(input: TaxCalculationInput): TaxCalculationResult;
  validateBusiness(business: Business): ValidationResult;
  validateClient?(client: Client): ValidationResult;
}

export function getTaxProvider(taxCountry: TaxCountry): TaxProvider {
  switch (taxCountry) {
    case 'IN': return indiaGstProvider;
    case 'AE': return uaeVatProvider;
    default:   throw new Error(`Unsupported tax country: ${taxCountry}`);
  }
}

// services/tax.service.ts — single entry for app code
export function calculateTax(taxCountry: TaxCountry, input: TaxCalculationInput) {
  return getTaxProvider(taxCountry).calculate(input);
}
```

### India provider (`IN`) — GST

Same logic as before, isolated in `india-gst.provider.ts`:

- **Line columns:** Item, HSN/SAC, GST %, Qty, Rate, Amount, **CGST**, **SGST**, **IGST**, Total
- **Configure GST drawer:** place of supply, tax treatment, reverse charge
- **Split:** intra-state → CGST + SGST; inter-state / overseas → IGST
- **Persist:** `cgstAmount`, `sgstAmount`, `igstAmount` on document; `taxBreakdown.gst` in JSON

```ts
// packages/tax/providers/india-gst.provider.ts (excerpt)
export const indiaGstProvider: TaxProvider = {
  country: 'IN',
  calculate(input) { /* CGST/SGST/IGST logic */ },
  validateBusiness(b) {
    if (b.taxTreatment === 'REGISTERED' && !b.gstin) return invalid('GSTIN required');
    return valid();
  },
};
```

### UAE provider (`AE`) — VAT (Dubai / Emirates)

- **Line columns:** Item, Description, Qty, Rate, Taxable amount, **VAT %**, **VAT amount**, Total  
  (No CGST/SGST/IGST — hide those columns entirely for `AE`)
- **Configure VAT drawer:** TRN, emirate, VAT treatment (standard / zero-rated / exempt)
- **Typical rates:** 5% standard, 0% zero-rated, exempt (seed on business create)
- **Persist:** `cgst/sgst/igst` = 0; store VAT in `taxBreakdown.vat` and line `values.vat_amount`

```ts
// packages/tax/providers/uae-vat.provider.ts (excerpt)
export const uaeVatProvider: TaxProvider = {
  country: 'AE',
  calculate(input) {
    // per line: vatAmount = taxable * vatRate / 100
    // document: totalVat, totalAmount
  },
  validateBusiness(b) {
    if (!b.trn) return invalid('TRN required for UAE VAT invoices');
    return valid();
  },
};
```

### Tax profile (what the invoice UI loads)

A **tax profile** is config — not user data — keyed by `taxCountry`:

```ts
// packages/tax/profiles/india.profile.ts
export const indiaTaxProfile: TaxProfile = {
  country: 'IN',
  currency: 'INR',
  configureTaxLabel: 'Configure GST',
  defaultLineColumns: ['item', 'hsn', 'gst_rate', 'quantity', 'rate', 'amount', 'cgst', 'sgst', 'total'],
  defaultTaxRates: [
    { name: 'GST 18%', rate: 18, type: 'GST' },
    { name: 'GST 12%', rate: 12, type: 'GST' },
    { name: 'GST 5%', rate: 5, type: 'GST' },
    { name: 'Exempt', rate: 0, type: 'EXEMPT' },
  ],
  businessFields: ['gstin', 'pan', 'stateCode'],
  clientFields: ['gstin', 'stateCode', 'country'],
};

// packages/tax/profiles/uae.profile.ts
export const uaeTaxProfile: TaxProfile = {
  country: 'AE',
  currency: 'AED',
  configureTaxLabel: 'Configure VAT',
  defaultLineColumns: ['item', 'quantity', 'rate', 'amount', 'vat_rate', 'vat_amount', 'total'],
  defaultTaxRates: [
    { name: 'VAT 5%', rate: 5, type: 'VAT' },
    { name: 'Zero rated', rate: 0, type: 'ZERO' },
    { name: 'Exempt', rate: 0, type: 'EXEMPT' },
  ],
  businessFields: ['trn', 'emirate'],
  clientFields: ['trn', 'country'],
};
```

On invoice mount:

```ts
const { taxCountry } = business;
const profile = getTaxProfile(taxCountry);
// Apply profile.defaultLineColumns to table; show profile.configureTaxLabel in toolbar
```

### `taxBreakdown` JSON (country-agnostic storage)

```ts
// India example
{
  "country": "IN",
  "cgst": "900.00",
  "sgst": "900.00",
  "igst": "0.00",
  "cess": "0.00"
}

// UAE example
{
  "country": "AE",
  "vat": "50.00",
  "vatRateSummary": [{ "rate": 5, "taxable": "1000.00", "vat": "50.00" }]
}
```

Reports and PDF read `taxBreakdown` + legacy columns for India.

### Registration & settings UI

| Step | UI |
|------|-----|
| **Register** | Country selector: **India** \| **UAE (Dubai)** → sets `taxCountry`, currency, seeds profile |
| **Settings → Business** | Show country-specific fields only (GSTIN vs TRN) |
| **Settings → Taxes** | List `tax_rates` filtered by `business.taxCountry` |
| **Invoice toolbar** | Button text from profile: "Configure GST" or "Configure VAT" |

### Seeding on business create

```ts
// packages/tax/seed/seed-tax-profile.ts
export async function seedTaxProfileForBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  taxCountry: TaxCountry
) {
  const profile = getTaxProfile(taxCountry);
  await tx.taxRate.createMany({
    data: profile.defaultTaxRates.map(r => ({ ...r, businessId, taxCountry })),
  });
  // Clone system DocumentFieldDefinitions + default line columns for IN or AE
}
```

### Compliance features (by country)

| Feature | India (`IN`) | UAE (`AE`) |
|---------|:------------:|:----------:|
| Multi-component tax on invoice | CGST/SGST/IGST **MVP** | VAT **MVP** |
| Tax registration on business | GSTIN **MVP** | TRN **MVP** |
| HSN / SAC on lines | **MVP** | Optional |
| B2B vs B2C format | **MVP** | Simpler |
| e-Invoice / IRN | High (later) | — |
| e-Way Bill | High (later) | — |
| GSTR-1 export | Medium | — |
| FTA VAT return export | — | Medium (later) |
| TDS / reverse charge | Medium | — |

### Phase 5 definition of done

- [ ] Register includes country selector (India / UAE Dubai); correct currency and seed
- [ ] `getTaxProvider(IN)` and `getTaxProvider(AE)` with unit tests
- [ ] Invoice editor loads columns + Configure Tax UI from `getTaxProfile(taxCountry)`
- [ ] India invoice shows CGST/SGST/IGST; UAE invoice shows VAT only (no GST columns)
- [ ] `documents.taxCountry` snapshotted; `taxBreakdown` populated per country
- [ ] `tax_rates` CRUD scoped to `business.taxCountry`
- [ ] Cannot create UAE tax rate on India business (server validation)

---

## 12. Phase 6 — PDF, Email & Notifications

> **Full implementation plan:** [PDF-GENERATION.MD](./PDF-GENERATION.MD) — dynamic templates, field customization, layout/blocks, save & reuse, per document type (invoice, quotation, etc.).

### PDF generation

```ts
// services/pdf.service.ts

// Use BullMQ for async PDF generation — never block the request
export async function queuePDFGeneration(documentId: string, businessId: string) {
  await pdfQueue.add('generate-pdf', { documentId, businessId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

// Worker (runs separately)
pdfWorker.process('generate-pdf', async (job) => {
  const { documentId, businessId } = job.data;
  const document = await fetchDocumentWithItems(documentId, businessId);
  const pdfBuffer = await renderDocumentToPDF(document);

  const s3Key = `businesses/${businessId}/documents/${documentId}/invoice.pdf`;
  await uploadToS3(s3Key, pdfBuffer, 'application/pdf');

  await prisma.document.update({
    where: { id: documentId },
    data: { pdfUrl: getPresignedUrl(s3Key) },
  });
});
```

### Email queue

```ts
// services/email.service.ts

// Queue email — never send synchronously in request path
export async function queueDocumentEmail(params: {
  documentId: string;
  businessId: string;
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
}) {
  await emailQueue.add('send-document-email', params, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
  });
}

// Automated reminders — scheduled via BullMQ repeatable jobs
export async function scheduleOverdueReminders() {
  const overdueInvoices = await prisma.document.findMany({
    where: {
      documentType: 'INVOICE',
      status: 'OVERDUE',
      dueDate: { lt: new Date() },
    },
    include: { client: true, business: true },
  });

  for (const invoice of overdueInvoices) {
    await queueDocumentEmail({ /* reminder params */ });
  }
}
```

---

## 13. Phase 7 — Dashboard & Reports

### Dashboard aggregations

All dashboard queries must use `businessId` in every WHERE clause. Compute aggregates at query time for accuracy; cache with Redis (TTL: 5 minutes) for performance.

```ts
// modules/dashboard/dashboard.service.ts

export async function getDashboardMetrics(businessId: string, period: DateRange) {
  const [revenue, outstanding, topClients, recentDocs] = await Promise.all([
    // Total revenue in period
    prisma.document.aggregate({
      where: { businessId, documentType: 'INVOICE', status: 'PAID',
               issueDate: { gte: period.start, lte: period.end } },
      _sum: { totalAmount: true },
    }),
    // Outstanding (sent + overdue)
    prisma.document.aggregate({
      where: { businessId, documentType: 'INVOICE',
               status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      _sum: { balanceAmount: true },
    }),
    // Top 5 clients by revenue
    prisma.document.groupBy({
      by: ['clientId'],
      where: { businessId, documentType: 'INVOICE', status: 'PAID',
               issueDate: { gte: period.start, lte: period.end } },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    }),
    // Recent documents
    prisma.document.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { client: { select: { name: true } } },
    }),
  ]);

  return { revenue, outstanding, topClients, recentDocs };
}
```

### Key reports to build

| Report | Data source | Format |
|--------|-------------|--------|
| P&L Summary | documents + payments | Table + chart |
| GST Summary (GSTR-1 format) | documents | Table + CSV/Excel |
| Accounts Receivable Aging | invoices by due date | Table |
| Client-wise revenue | documents grouped by client | Table + chart |
| Product-wise revenue | document_items grouped by product | Table |
| Payment collection report | payments | Table |
| Outstanding invoices | invoices with balance > 0 | Table |

---

## 14. Cross-Cutting Systems

### Audit logging

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  action     String                        // e.g. "INVOICE_CREATED"
  entityType String?  @map("entity_type")  // e.g. "Document"
  entityId   String?  @map("entity_id") @db.Uuid
  oldValues  Json?    @map("old_values")
  newValues  Json?    @map("new_values")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([businessId, createdAt])
  @@index([businessId, entityType, entityId])
  @@map("audit_logs")
}
```

### File storage

- All uploads go through a pre-signed URL flow — files are never proxied through the app server.
- S3 key format: `businesses/{businessId}/{module}/{year}/{month}/{uuid}.{ext}`
- No public URLs on any tenant bucket. Always generate short-lived pre-signed URLs (15 min).
- Validate MIME type server-side before generating the upload URL.

```ts
// lib/storage/s3.ts

export async function getUploadPresignedUrl(params: {
  businessId: string;
  module: 'documents' | 'logos' | 'attachments';
  filename: string;
  mimeType: string;
}): Promise<{ uploadUrl: string; key: string }> {
  const ext = path.extname(params.filename);
  const key = `businesses/${params.businessId}/${params.module}/${format(new Date(), 'yyyy/MM')}/${uuid()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: params.mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return { uploadUrl, key };
}
```

---

## 15. API Design Patterns

### Server Actions (primary pattern)

```ts
// modules/sales-and-invoices/invoices/invoice.actions.ts
// uses modules/shared/documents/document.service.ts
'use server';

export async function createInvoice(input: CreateInvoiceInput) {
  // 1. Auth + permission
  const session = await requirePermission(PERMISSIONS.INVOICE_CREATE);

  // 2. Validate input
  const data = createInvoiceSchema.parse(input);

  // 3. Use tenant-scoped client — businessId injected automatically
  const db = createTenantClient(session.activeBusinessId);

  return await prisma.$transaction(async (tx) => {
    // 4. Generate document number (atomic)
    const documentNumber = await generateDocumentNumber(tx, session.activeBusinessId, 'INVOICE');

    // 5. Calculate tax via country provider (IN = GST, AE = VAT)
    const business = await tx.business.findUniqueOrThrow({
      where: { id: session.activeBusinessId },
    });
    const tax = calculateTax(business.taxCountry, { items: data.items, ...taxParams });

    // 6. Create document
    const document = await tx.document.create({
      data: {
        businessId: session.activeBusinessId,  // belt + suspenders
        documentNumber,
        documentType: 'INVOICE',
        taxCountry: business.taxCountry,
        ...tax.totals,
        taxBreakdown: tax.breakdown,
        createdBy: session.user.id,
        items: { createMany: { data: tax.items } },
      },
    });

    // 7. Audit log
    await tx.auditLog.create({
      data: {
        businessId: session.activeBusinessId,
        userId: session.user.id,
        action: 'INVOICE_CREATED',
        entityType: 'Document',
        entityId: document.id,
        newValues: { documentNumber, totalAmount: tax.total },
      },
    });

    return document;
  });
}
```

### Route Handlers (webhooks only)

```ts
// app/api/webhooks/razorpay/route.ts

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();

  // Always verify webhook signature
  if (!verifyRazorpaySignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  // Process asynchronously — return 200 immediately
  await webhookQueue.add('razorpay', event);

  return new Response('OK', { status: 200 });
}
```

### Never trust client-supplied businessId

```ts
// ❌ WRONG
export async function getInvoices(businessId: string) {
  return prisma.document.findMany({ where: { businessId } }); // attacker controls this
}

// ✅ CORRECT — keyset paginated list
export async function listInvoices(input: ListInvoicesInput) {
  const session = await getSessionOrThrow();
  await requirePermission(PERMISSIONS.INVOICE_VIEW);

  const { cursor, limit, status } = listInvoicesSchema.parse(input);

  return keysetPaginate({
    model: prisma.document,
    where: {
      businessId: session.activeBusinessId,
      documentType: 'INVOICE',
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor,
    limit,
  });
}
```

### Keyset pagination (implementation)

**Single source of truth:** `packages/pagination` — see [§6 Shared pagination package](#shared-pagination-package-packagespagination).

Implement `keysetPaginate`, `paginationInputSchema`, and `useKeysetInfiniteQuery` **once** in that package. Every module imports them; do not duplicate pagination code under `modules/*` or `lib/`.

#### Core implementation (`packages/pagination/src/keyset-paginate.ts`)

```ts
import { decodeCursor, encodeCursor } from './cursor';
import type { PaginatedResponse } from './types';

export async function keysetPaginate<T extends { id: string; createdAt: Date }>(args: {
  model: { findMany: (q: unknown) => Promise<T[]> };
  where: Record<string, unknown>;
  orderBy: Array<Record<string, 'asc' | 'desc'>>;
  cursor?: string;
  limit: number;
  select?: Record<string, boolean>;
}): Promise<PaginatedResponse<T>> {
  const cursor = decodeCursor(args.cursor);
  const { limit, model, where, orderBy, select } = args;

  const rows = await model.findMany({
    where: {
      ...where,
      ...(cursor && {
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      }),
    },
    orderBy,
    take: limit + 1,
    ...(select && { select }),
  });

  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const last = items.at(-1);

  return {
    items,
    pageInfo: {
      hasNextPage,
      nextCursor:
        hasNextPage && last
          ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    },
  };
}
```

#### Checklist when adding a new list screen

1. Add `listXSchema = paginationInputSchema.extend({ /* filters */ })`.
2. Add `listX` Server Action → `keysetPaginate({ where: { businessId, ... }, select })`.
3. Add `useXList` hook → `useKeysetInfiniteQuery({ queryFn: (c) => listX({ ...filters, cursor: c }) })`.
4. Page in `app/(dashboard)/.../page.tsx` → `<KeysetDataTable query={useXList(filters)} />`.
5. Prisma model: `@@index([businessId, createdAt, id])` (+ status index if filtered).

Never return `totalCount` on list requests. Dashboard totals use cached aggregates.

#### Sorting on other columns

Pass `sortBy` + `sortDir` into `paginationInputSchema.extend()`; validate against `SORT_ALLOWLIST` in `packages/pagination/src/sort-presets.ts`. Cursor encodes `{ [sortField]: value, id }`. Add matching composite index per sort.

#### What NOT to do

```ts
// ❌ OFFSET pagination on large tables
await prisma.document.findMany({
  skip: page * 20,
  take: 20,
});

// ❌ Cursor without tie-breaker id (duplicate createdAt breaks pages)
orderBy: { createdAt: 'desc' }

// ❌ Client sends raw { createdAt, id } without tenant check on the query
where: { id: { gt: cursor.id } }  // missing businessId
```

---

## 16. Error Handling Strategy

```ts
// lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthenticated') {
    super('UNAUTHENTICATED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(permission?: string) {
    super('FORBIDDEN', `Missing permission: ${permission}`, 403, { permission });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class TenantError extends AppError {
  constructor() {
    super('NO_ACTIVE_BUSINESS', 'No active business context', 400);
  }
}

// Wrap Server Actions with consistent error handling
export function withErrorHandling<T>(
  action: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  return action()
    .then((data) => ({ data, error: null }))
    .catch((err) => {
      if (err instanceof AppError) return { data: null, error: err.message };
      console.error('[Action Error]', err);
      return { data: null, error: 'An unexpected error occurred' };
    });
}
```

---

## 17. Performance & Caching

### Redis caching pattern

```ts
// lib/cache.ts

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Cache permissions per user per business (invalidate on role change)
export const getPermissionsKey = (userId: string, businessId: string) =>
  `permissions:${userId}:${businessId}`;

// Cache dashboard metrics (5 min TTL)
export const getDashboardKey = (businessId: string, period: string) =>
  `dashboard:${businessId}:${period}`;
```

### Query performance rules

1. All list queries must use **`keysetPaginate` from `@repo/pagination`** ([§6](#shared-pagination-package-packagespagination)) — no `skip`/`OFFSET`; no copy-paste pagination per module.
2. Never use `findMany` without a `take` limit (`limit + 1` pattern for `hasNextPage`).
3. Use `select` to fetch only required fields — never return full rows or large JSON blobs to list views.
4. Compound indexes must include tie-breaker `id`: `(business_id, created_at DESC, id DESC)` and `(business_id, status, created_at DESC, id DESC)`.
5. Use `Promise.all` for independent queries. Never chain awaits for parallel data.
6. Avoid `COUNT(*)` on list pages; use cached aggregates for dashboard totals.

---

## 18. Testing Strategy

| Level | Tool | What to test |
|-------|------|-------------|
| Unit | Vitest | Tax providers (IN GST, AE VAT), document numbering, permission checks |
| Integration | Vitest + test DB | Server Actions with real Prisma against test PostgreSQL; keyset page boundaries |
| E2E | Playwright | Full user flows: register → create invoice → send → pay |
| Security | Custom test suite | IDOR: access another tenant's resources via known UUIDs |

### Keyset pagination tests (`packages/pagination`)

```ts
// packages/pagination/src/__tests__/keyset-paginate.test.ts
describe('keysetPaginate', () => {
  it('returns first page without cursor', async () => { /* ... */ });
  it('returns next page using nextCursor', async () => { /* ... */ });
  it('hasNextPage false on last page', async () => { /* ... */ });
  it('does not duplicate rows when many share same createdAt', async () => {
    // create 3 docs with identical createdAt — ids must still page correctly
  });
  it('never returns rows from another businessId', async () => { /* tenant isolation */ });
});
```

### Critical security tests (mandatory before Phase 2)

```ts
// __tests__/security/tenant-isolation.test.ts

describe('Tenant isolation', () => {
  it('User A cannot read User B invoices by UUID', async () => {
    const { businessId: bizA, token: tokenA } = await createTestTenant('a@test.com');
    const { businessId: bizB } = await createTestTenant('b@test.com');

    const invoiceB = await createTestInvoice(bizB);

    // Authenticated as User A, try to fetch User B's invoice
    const response = await fetch(`/api/invoices/${invoiceB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(response.status).toBe(404); // must not be 200
  });

  it('businessId in request body is ignored', async () => {
    const { businessId: bizA, token: tokenA } = await createTestTenant('a@test.com');
    const { businessId: bizB } = await createTestTenant('b@test.com');

    const result = await createInvoiceAction({
      businessId: bizB,  // attacker injects this
      /* ... other fields */
    });

    // Invoice must be created in bizA (from session), not bizB
    const invoice = await prisma.document.findUnique({ where: { id: result.id } });
    expect(invoice?.businessId).toBe(bizA);
    expect(invoice?.businessId).not.toBe(bizB);
  });
});
```

---

## 19. Security Checklist

Review before every phase transition.

### Authentication & Session
- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] Password reset tokens are single-use and expire in 1 hour
- [ ] Session tokens rotated on privilege change
- [ ] No sensitive data in JWT payload or cookies beyond IDs

### Tenant isolation
- [ ] IDOR tests: random UUIDs for other tenants return 404/403
- [ ] List endpoints always include `business_id` in WHERE clause
- [ ] `businessId` is NEVER sourced from client request body
- [ ] Tenant-scoped Prisma extension tested for all query types
- [ ] Background jobs carry `businessId` in payload (never inferred)

### Data & Files
- [ ] No public S3 URLs for any tenant files
- [ ] Pre-signed URL expiry ≤ 15 minutes
- [ ] MIME type validated server-side before accepting uploads
- [ ] Financial figures stored as `Decimal`, never `Float`
- [ ] All admin/seed scripts tag every row with a business

### API & Actions
- [ ] All Server Actions require authentication and permission check
- [ ] Webhook signatures verified before processing
- [ ] Rate limiting on auth endpoints (register, login, password reset)
- [ ] Logs never print PII or full financial data

### Compliance
- [ ] Audit log covers every financial mutation
- [ ] Soft delete on all operational tables (no hard delete of financial records)
- [ ] India: GSTIN and PAN validation regex applied at input
- [ ] UAE: TRN format validated (15 digits) when `taxCountry = AE`
- [ ] Tax rates cannot be created for a country other than `business.taxCountry`

---

## 20. Sprint Roadmap

| Sprint | Duration | Focus | Exit Criteria |
|--------|----------|-------|---------------|
| **1** | 2 weeks | Auth + Tenant + RBAC + `@repo/pagination` package + Audit stub | Shared `keysetPaginate` + tests; IDOR tests pass |
| **2** | 1.5 weeks | Clients + Products + Tax rates (per country) | CRUD; seed IN/AE rates; country-specific validation |
| **3** | 2 weeks | Document engine + country tax providers | `packages/tax` IN + AE; register country selector |
| **4** | 2 weeks | Invoice editor + tax UI | India: CGST/SGST/IGST; UAE: VAT columns; Configure GST/VAT drawer |
| **5** | 1.5 weeks | Payments + Receipts | One payment → multiple invoice allocations; balance tracking |
| **6** | 1.5 weeks | Sales Order + Delivery Challan + Credit Note | Parent→child chain; status transitions |
| **7** | 1.5 weeks | PDF templates + Email queue | 2+ templates; async generation; delivery tracking |
| **8** | 1.5 weeks | Dashboard + Reports + Notifications | KPI metrics; country-aware tax reports; overdue reminders |
| **9** | 1 week | India: e-Invoice + e-Way Bill (optional) | IRN/QR for IN only; skip for AE in MVP |
| **10** | 1 week | Performance + Security audit + Polish | Load test; penetration test; UX review |

---

## 21. Future Scope (Post-MVP)

All future features reuse the same `business_id` isolation rules. No exceptions. Each row maps to a **reserved domain folder** (see [§5 Repository Layout](#5-repository-layout)).

| Feature | Folder / route | Notes |
|---------|----------------|-------|
| **Accounts (COA / Journal / GL)** | `modules/accounting/`, `/accounting` | Sidebar: Accounting (New) |
| **Full inventory** | `modules/products-and-inventory/stock/` | Sidebar: Products & Inventory |
| **Purchase management** | `modules/purchases-and-expenses/*` | Vendor leads, POs, debit notes, payout receipts |
| **Recurring invoices** | `modules/shared/documents/` + scheduler | BullMQ; linked from invoices |
| **CRM & Leads** | `modules/sales-crm-and-leads/` | Sidebar: Sales CRM & Leads |
| **GST Reports** | `modules/gst-reports/` | Sidebar: GST Reports (IN only) |
| **Banking & Payments** | `modules/banking-and-payments/` | Sidebar item |
| **Payroll & HRMS** | `modules/payroll-and-hrms/` | Sidebar item |
| **Workflows** | `modules/workflows-and-automations/` | Sidebar item |
| **Manage Team** | `modules/manage-team/` | Sidebar item |
| **Multi-currency** | Exchange rates; realised/unrealised gains |
| **WhatsApp delivery** | Document sharing via WhatsApp Business API |
| **Mobile app** | React Native; reuse validation + types packages |
| **CA/Accountant portal** | Invite CA to read-only access across multiple businesses |
| **Embedded billing** | White-label; API-first mode for platforms (like Refrens Embedded) |
| **TDS management** | Deduction tracking; Form 26AS reconciliation |
| **Subscription billing** | Plan management; metered usage; Razorpay Subscriptions |

---

> **Last updated:** Shared `@repo/pagination` package for all list endpoints  
> **Owner:** Engineering Lead  
> **Review cadence:** After each sprint before the next begins