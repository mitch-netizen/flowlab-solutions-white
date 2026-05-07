# FlowLab Solutions

**Multi-tenant field service platform for sole operators and tradies.**

FlowLab gives field service businesses a branded, end-to-end operations layer — from customer enquiry through to Xero invoice — without hiring an office.

## Product reference maintenance

The canonical product reference is `docs/flowlab-saas-specs-features-benefits-faq.md`. Any LLM, coding agent, or developer changing user-facing features, plan limits, integrations, automation behavior, onboarding, architecture, runtime specs, environment requirements, or known caveats must update that document in the same change when the reference would otherwise become stale.

## What it is

FlowLab runs as a white-label SaaS. Each customer gets their own subdomain (or custom domain), their own isolated data, and a portal that feels like it was built for them. The platform is structured around five distinct apps:

| App | Purpose |
|-----|---------|
| **Overview** | Morning brief — what's on today, outstanding tasks, key metrics |
| **CRM** | Customer records, enquiries, communication history, feedback |
| **Jobs** | Job board (swim-lane view), job cards, scheduling, mobile field view |
| **Revenue** | Invoices (Xero-backed), payment status, billing trail |
| **Setup** | Integrations (Xero, DocuSeal, optional Make.com), settings, system health |

Everything is linked. A customer has a Xero Contact (`xeroContactId`). An invoice has a Xero Invoice (`xeroInvoiceId`). A job links to one invoice. Nothing is inferred or guessed.

## Architecture

```
flowlab-solutions/
├── apps/
│   ├── web/          — Marketing site, signup, FlowLab superadmin
│   ├── portal/       — Tenant dashboard (Next.js 15 App Router)
│   └── worker/       — Async job processor
└── packages/
    ├── db/           — Prisma schema, migrations, typed query functions
    ├── auth/         — JWT utilities, session helpers
    ├── integrations/ — Xero, DocuSeal, Make.com API clients
    ├── automation/   — Workflow trigger logic
    ├── branding/     — Tenant theme and white-label config
    ├── contracts/    — Shared TypeScript types and Zod schemas
    ├── events/       — Event bus and audit logging
    └── ui/           — Shared component library
```

## Tech stack

- **Framework**: Next.js 15 (App Router), React 19
- **Database**: PostgreSQL via Supabase, Prisma ORM
- **Auth**: Supabase Auth (`@supabase/ssr`), lazy migration from bcrypt
- **Invoicing**: Xero API (OAuth 2.0) — source of truth for all invoices
- **Agreements**: DocuSeal
- **Automation**: Optional Make.com blueprint templates for external orchestration
- **Multi-tenancy**: Host-based tenant resolution, RLS on every table
- **Monorepo**: npm workspaces + Turborepo

## Quick start

```bash
cp .env.example .env.local    # fill in the exact env names below
npm install
npm run env:check:web         # confirm required envs for web
npm run env:check:portal      # confirm required envs for portal
npm run env:check:worker      # confirm required envs for worker
npm run db:generate           # generate Prisma client
npm run db:push               # push schema to your Supabase project
npm run db:seed               # seed demo tenant (Lawn & Order)
npm run dev:web               # marketing site → localhost:3000
npm run dev:portal            # tenant portal → localhost:3001?tenant=lawnorder
```

**Demo login** (after seed): `owner@lawnorder.com.au` / `LawnOrder123!`

> **Dev note**: `*.localhost` subdomains don't resolve reliably in browsers. Use `localhost:3001?tenant=<slug>` instead. The slug is persisted in a `__flowlab_dev_tenant` cookie for subsequent requests.

## Required environment variables

FlowLab reads exact variable names from `packages/contracts/src/server.ts`. The most important ones are:

```bash
DATABASE_URL
DIRECT_URL
DEFAULT_ROOT_DOMAIN
JWT_SECRET
ENCRYPTION_MASTER_KEY
```

App-specific checks:

- `web`: `npm run env:check:web`
- `portal`: `npm run env:check:portal`
- `worker`: `npm run env:check:worker`

Supabase/Auth variables that need to exist anywhere the app uses login, signup, or session refresh:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Portal and worker also require:

```bash
CRON_SECRET
```

## Key design principles

- **No guessing**: every relationship is explicit. Customer → `xeroContactId`. Invoice → `xeroInvoiceId`. Job → `invoiceId`. Nothing inferred from names or fuzzy matches.
- **Xero is the invoice source of truth**: the local `Invoice` record is a mirror of Xero, not the primary. Creating an invoice in FlowLab calls Xero first.
- **Tenant isolation**: all database queries are scoped by `tenantId`. Supabase RLS enforces this at the row level on all 26 tables.
- **Linked, trackable, accountable**: the job card shows the customer, the billing trail, communications, and feedback in one place.

## Integrations

| Integration | Status | What it does |
|-------------|--------|-------------|
| **Xero** | OAuth 2.0, token refresh | Contacts + Invoices (AUTHORISED on create) |
| **DocuSeal** | API key | Service agreement generation and signing |
| **Make.com** | Optional webhook triggers | Automation blueprint pack for external follow-up, review prompts, rebook, and custom scenarios |

## Tenant onboarding flow

1. Sign up at `/signup` → trial tenant created, subdomain provisioned
2. Walk through onboarding checklist: branding, Xero connect, DocuSeal, automations
3. Embed branded enquiry form on own website
4. Operate: enquiry → quote → job → Xero invoice → signed off

## Database

Schema lives in `packages/db/prisma/schema.prisma`. Migrations are applied via Supabase MCP or `prisma migrate deploy`. After any schema change:

```bash
npm run db:generate    # regenerate Prisma client types
```

Key tables: `Tenant`, `TenantUser`, `Customer`, `Job`, `Invoice`, `Quote`, `Communication`, `Feedback`, `Integration`, `AuditLog`.
