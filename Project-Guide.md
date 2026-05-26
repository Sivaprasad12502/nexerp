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
7. [Phase 1 — Auth, Tenant Context & RBAC](#7-phase-1--auth-tenant-context--rbac)
8. [Phase 2 — Master Data](#8-phase-2--master-data)
9. [Phase 3 — Document Engine](#9-phase-3--document-engine)
10. [Phase 4 — Financial Modules](#10-phase-4--financial-modules)
11. [Phase 5 — GST & Indian Tax Compliance](#11-phase-5--gst--indian-tax-compliance)
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
| **Fail closed** | A missing permission or tenant context must throw, never silently pass. |
| **Audit everything** | Financial systems have legal accountability requirements. Every mutation is logged. |
| **India-first compliance** | GST, TDS, e-Invoice (IRN/QR), e-Way Bill, PAN, GSTIN — these are core features, not add-ons. |

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
| Data Tables | **TanStack Table v8** | Server-side pagination, sorting, filtering |
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

Use a monorepo. Shared packages prevent drift between web app and future mobile/API consumers.

```
root/
├── apps/
│   └── web/                          # Next.js 15 application
│       ├── app/
│       │   ├── (auth)/               # Public: login, register, forgot-password
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   └── forgot-password/
│       │   ├── (dashboard)/          # Protected: all app routes
│       │   │   ├── layout.tsx        # Loads business + permissions into context
│       │   │   ├── clients/
│       │   │   ├── products/
│       │   │   ├── quotations/
│       │   │   ├── invoices/
│       │   │   ├── payments/
│       │   │   ├── reports/
│       │   │   └── settings/
│       │   └── api/
│       │       ├── auth/[...nextauth]/
│       │       └── webhooks/         # Razorpay, Stripe, etc.
│       ├── components/               # Shared presentational UI
│       ├── modules/                  # Feature modules (co-located logic)
│       │   ├── auth/
│       │   ├── tenants/
│       │   ├── rbac/
│       │   ├── clients/
│       │   ├── products/
│       │   ├── documents/            # Core document engine
│       │   ├── payments/
│       │   ├── gst/
│       │   ├── reports/
│       │   └── settings/
│       ├── lib/
│       │   ├── auth/
│       │   │   ├── config.ts         # Auth.js configuration
│       │   │   └── session.ts        # Session helpers
│       │   ├── tenant/
│       │   │   ├── context.ts        # Active business resolver
│       │   │   └── prisma-extension.ts  # Tenant-scoped Prisma client
│       │   ├── rbac/
│       │   │   ├── permissions.ts    # Permission catalog
│       │   │   └── check.ts         # can() helper
│       │   ├── db/
│       │   │   └── client.ts        # Prisma client singleton
│       │   └── env.ts               # Validated environment variables
│       ├── services/                 # Domain services
│       │   ├── gst.service.ts
│       │   ├── document-number.service.ts
│       │   ├── pdf.service.ts
│       │   └── email.service.ts
│       ├── actions/                  # Next.js Server Actions
│       │   ├── client.actions.ts
│       │   ├── document.actions.ts
│       │   └── payment.actions.ts
│       └── middleware.ts
│
├── packages/
│   ├── ui/                           # Shared ShadCN components
│   ├── validations/                  # Zod schemas (shared across app)
│   ├── database/                     # Prisma schema + generated client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── models/
│   │           ├── auth.prisma
│   │           ├── tenant.prisma
│   │           ├── rbac.prisma
│   │           ├── client.prisma
│   │           ├── product.prisma
│   │           └── document.prisma
│   └── types/                        # Shared TypeScript types
│
├── docker-compose.yml
├── .env.example
└── turbo.json                        # Turborepo config
```

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
@@index([businessId, createdAt])   // for pagination
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
CREATE INDEX idx_{table}_business_created ON {table}(business_id, created_at DESC);

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

    // 3. Create default business (isolated workspace)
    const business = await tx.business.create({
      data: {
        name: parsed.businessName ?? `${parsed.name}'s Business`,
        currency: 'INR',
        country: 'IN',
      },
    });

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
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  legalName   String?  @map("legal_name")
  gstin       String?
  pan         String?
  email       String?
  phone       String?
  address     String?
  city        String?
  state       String?
  country     String   @default("IN")
  pincode     String?
  currency    String   @default("INR")
  logoUrl     String?  @map("logo_url")
  settings    Json     @default("{}")  // theme, invoice prefix, fiscal year, etc.
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  users       BusinessUser[]
  clients     Client[]
  products    Product[]
  documents   Document[]
  // ... all tenant-owned relations

  @@map("businesses")
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

```prisma
model Client {
  id            String   @id @default(uuid()) @db.Uuid
  businessId    String   @map("business_id") @db.Uuid
  name          String
  email         String?
  phone         String?
  gstin         String?
  pan           String?
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
  id         String   @id @default(uuid()) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  name       String   // e.g. "GST 18%"
  rate       Decimal  @db.Decimal(5, 2)
  type       TaxType  @default(GST)
  cgst       Decimal? @db.Decimal(5, 2)  // half of rate for intra-state
  sgst       Decimal? @db.Decimal(5, 2)  // half of rate for intra-state
  igst       Decimal? @db.Decimal(5, 2)  // full rate for inter-state
  isDefault  Boolean  @default(false) @map("is_default")

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  products Product[]

  @@index([businessId])
  @@map("tax_rates")
}

enum ProductType { PRODUCT SERVICE }
enum TaxType { GST IGST EXEMPT NIL }
```

---

## 9. Phase 3 — Document Engine

**Single engine for all document types.** This is the most important architectural decision in the system.

### Why one engine?

Quotation → Sales Order → Invoice → Receipt is a workflow chain. Each document may reference its parent. A unified schema makes conversion trivial — you're updating a `document_type` and status, not migrating rows between tables. It also means all business logic (numbering, calculations, PDF templates, email sending) is written once.

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

  // GST metadata
  placeOfSupply    String?   @map("place_of_supply")  // state code
  isIgst           Boolean   @default(false) @map("is_igst")
  reverseCharge    Boolean   @default(false) @map("reverse_charge")

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

## 11. Phase 5 — GST & Indian Tax Compliance

This is a first-class feature for the Indian market, not an afterthought.

### GST calculation service

```ts
// services/gst.service.ts

export interface GSTCalculationInput {
  items: Array<{
    rate: number;
    quantity: number;
    price: number;
    discount: number;  // percentage
    taxRate: number;   // e.g. 18
  }>;
  placeOfSupply: string;      // state code, e.g. "27" for Maharashtra
  businessStateCode: string;  // seller state code
  taxTreatment: TaxTreatment;
  reverseCharge?: boolean;
}

export interface GSTCalculationOutput {
  subtotal: Decimal;
  discountAmount: Decimal;
  taxableAmount: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  cess: Decimal;
  total: Decimal;
  isIgst: boolean;
  items: GSTLineItem[];
}

export function calculateGST(input: GSTCalculationInput): GSTCalculationOutput {
  const isIgst = input.placeOfSupply !== input.businessStateCode
    || input.taxTreatment === TaxTreatment.OVERSEAS;

  const items = input.items.map((item) => {
    const grossAmount = new Decimal(item.quantity).mul(item.price);
    const discountAmt = grossAmount.mul(item.discount).div(100);
    const taxable = grossAmount.sub(discountAmt);

    const cgst = isIgst ? new Decimal(0) : taxable.mul(item.taxRate / 2).div(100);
    const sgst = isIgst ? new Decimal(0) : taxable.mul(item.taxRate / 2).div(100);
    const igst = isIgst ? taxable.mul(item.taxRate).div(100) : new Decimal(0);

    return { ...item, taxable, cgst, sgst, igst, amount: taxable.add(cgst).add(sgst).add(igst) };
  });

  return {
    subtotal:      items.reduce((s, i) => s.add(i.grossAmount), new Decimal(0)),
    discountAmount:items.reduce((s, i) => s.add(i.discountAmt), new Decimal(0)),
    taxableAmount: items.reduce((s, i) => s.add(i.taxable), new Decimal(0)),
    cgst:          items.reduce((s, i) => s.add(i.cgst), new Decimal(0)),
    sgst:          items.reduce((s, i) => s.add(i.sgst), new Decimal(0)),
    igst:          items.reduce((s, i) => s.add(i.igst), new Decimal(0)),
    cess:          new Decimal(0),  // implement cess logic if needed
    total:         items.reduce((s, i) => s.add(i.amount), new Decimal(0)),
    isIgst,
    items,
  };
}
```

### Compliance features (implement incrementally)

| Feature | Priority | Notes |
|---------|----------|-------|
| GST Invoice with CGST/SGST/IGST | **MVP** | Mandatory for registered businesses |
| B2B vs B2C invoice format | **MVP** | Different fields required |
| HSN/SAC codes on items | **MVP** | Mandatory above ₹50L turnover |
| e-Invoice (IRN + QR code) | High | Required for turnover >₹5Cr |
| e-Way Bill generation | High | Required for goods > ₹50,000 |
| GSTR-1 export | Medium | Monthly return data |
| TDS deduction tracking | Medium | Section 194C/194J |
| Reverse charge mechanism | Medium | Specific categories |
| Composition scheme | Low | Flat rate taxpayers |

---

## 12. Phase 6 — PDF, Email & Notifications

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
// modules/reports/dashboard.service.ts

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
// actions/document.actions.ts
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

    // 5. Calculate GST
    const gst = calculateGST({ items: data.items, ...gstParams });

    // 6. Create document
    const document = await tx.document.create({
      data: {
        businessId: session.activeBusinessId,  // belt + suspenders
        documentNumber,
        documentType: 'INVOICE',
        ...gst,
        createdBy: session.user.id,
        items: { createMany: { data: gst.items } },
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
        newValues: { documentNumber, totalAmount: gst.total },
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

// ✅ CORRECT
export async function getInvoices() {
  const session = await getSessionOrThrow();
  return prisma.document.findMany({
    where: { businessId: session.activeBusinessId },  // from verified session
  });
}
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

1. All list queries must be paginated (cursor-based preferred for large datasets).
2. Never use `findMany` without a `take` limit.
3. Use `select` to fetch only required fields — never return full rows to the client.
4. Compound indexes on `(business_id, status)` and `(business_id, created_at)` are mandatory.
5. Use `Promise.all` for independent queries. Never chain awaits for parallel data.

---

## 18. Testing Strategy

| Level | Tool | What to test |
|-------|------|-------------|
| Unit | Vitest | GST calculations, document numbering, permission checks |
| Integration | Vitest + test DB | Server Actions with real Prisma against test PostgreSQL |
| E2E | Playwright | Full user flows: register → create invoice → send → pay |
| Security | Custom test suite | IDOR: access another tenant's resources via known UUIDs |

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
- [ ] GSTIN validation regex applied at input
- [ ] PAN validation regex applied at input

---

## 20. Sprint Roadmap

| Sprint | Duration | Focus | Exit Criteria |
|--------|----------|-------|---------------|
| **1** | 2 weeks | Auth + Tenant + RBAC + Middleware + Audit stub | All Phase 1 DoD checked; IDOR tests pass |
| **2** | 1.5 weeks | Clients + Contacts + Products + Tax rates | CRUD with tenant isolation; validation complete |
| **3** | 2 weeks | Document engine + Quotation flow | Create → send → approve; document numbering; PDF stub |
| **4** | 2 weeks | Invoice + GST calculations | CGST/SGST/IGST correct; B2B/B2C formats; send via email |
| **5** | 1.5 weeks | Payments + Receipts | One payment → multiple invoice allocations; balance tracking |
| **6** | 1.5 weeks | Sales Order + Delivery Challan + Credit Note | Parent→child chain; status transitions |
| **7** | 1.5 weeks | PDF templates + Email queue | 2+ templates; async generation; delivery tracking |
| **8** | 1.5 weeks | Dashboard + Reports + Notifications | KPI metrics; GSTR-1 export; overdue reminders |
| **9** | 1 week | e-Invoice (IRN) + e-Way Bill | Government API integration; QR code on PDF |
| **10** | 1 week | Performance + Security audit + Polish | Load test; penetration test; UX review |

---

## 21. Future Scope (Post-MVP)

All future features reuse the same `business_id` isolation rules. No exceptions.

| Feature | Notes |
|---------|-------|
| **Accounts (COA / Journal / GL)** | Chart of accounts; double-entry ledger; trial balance; P&L; balance sheet |
| **Inventory management** | Stock tracking; FIFO/LIFO costing; low stock alerts |
| **Purchase management** | Purchase orders; bills; vendor management |
| **Recurring invoices** | BullMQ scheduler; flexible recurrence rules |
| **CRM** | Lead pipeline; follow-ups; activity log |
| **Multi-currency** | Exchange rates; realised/unrealised gains |
| **WhatsApp delivery** | Document sharing via WhatsApp Business API |
| **Mobile app** | React Native; reuse validation + types packages |
| **CA/Accountant portal** | Invite CA to read-only access across multiple businesses |
| **Embedded billing** | White-label; API-first mode for platforms (like Refrens Embedded) |
| **TDS management** | Deduction tracking; Form 26AS reconciliation |
| **Subscription billing** | Plan management; metered usage; Razorpay Subscriptions |

---

> **Last updated:** Sprint 0 — Architecture baseline  
> **Owner:** Engineering Lead  
> **Review cadence:** After each sprint before the next begins