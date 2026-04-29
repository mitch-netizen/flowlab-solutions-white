# FlowLab Codebase Guide For A Custom GPT

This document is written for a Custom GPT that needs to understand how FlowLab is actually coded so it can onboard users, answer implementation questions, and reason about the product without inventing architecture that does not exist.

Use this guide as the source of truth for how the current repo is structured and how the major systems interact.

## 1. What FlowLab Is

FlowLab is a multi-tenant, white-label field service platform for tradies and sole operators. The software covers the lifecycle from public enquiry to quote to job to invoice to customer follow-up.

The key product idea is that every important business object is explicitly linked:

- A tenant has its own brand, users, integrations, data, and optional domain.
- A customer can have enquiries, quotes, jobs, invoices, communications, and feedback.
- A job can come from a quote and can link to one invoice.
- An invoice can mirror a Xero invoice and store the external Xero ID.
- Automation jobs react to events like enquiry created, quote accepted, agreement signed, invoice created, feedback request, and trial expiry.

The app is intentionally opinionated:

- Multi-tenancy is a first-class concern.
- Xero is the source of truth for invoicing.
- Integrations are persisted per tenant.
- Public customer flows are tokenized and rate-limited.
- A worker-style automation queue handles background actions and retries.

## 2. Repo Snapshot

This is an npm workspaces monorepo.

Top-level layout:

```text
apps/
  web/       Marketing site, self-signup, superadmin
  portal/    Tenant-facing product app
  worker/    Long-running automation worker

packages/
  auth/         Auth helpers and Supabase clients
  automation/   Background job processor
  branding/     Tenant theming helpers
  contracts/    Shared types, schemas, env helpers, descriptors
  db/           Prisma client, schema, queries, orchestration logic
  events/       Platform event logging
  integrations/ External service clients and encryption helpers
  ui/           Shared React UI primitives and formatting helpers
```

Core top-level files:

- `package.json`: workspace scripts and dev commands
- `tsconfig.base.json`: path aliases for all `@flowlab/*` packages
- `.env.example`: required and optional env vars
- `vitest.config.ts`: unit/integration test config
- `playwright.config.ts`: browser smoke test config

## 3. Tech Stack

Current stack in code:

- Next.js 15 App Router in `apps/web` and `apps/portal`
- React 19
- TypeScript with `strict: true`
- Tailwind CSS v4 plus custom CSS variables
- Prisma ORM with PostgreSQL
- Supabase for database hosting and authentication
- Sentry for optional monitoring
- Xero, DocuSeal, Brevo, Google Maps, Claude, Stripe integrations
- Node worker process in `apps/worker`

Important nuance:

- The README mentions Turborepo, but there is no `turbo.json` in the current repo. The actual workspace orchestration shown in code is npm workspaces.

## 4. The Three Runtime Surfaces

FlowLab is not one app. It has three execution surfaces that work together.

### `apps/web`

This is the public platform site and platform admin surface.

Responsibilities:

- Marketing pages
- Self-signup flow
- Platform admin login
- Superadmin dashboard
- Platform-level Xero callback routes
- Admin tenant management and impersonation

Examples:

- `apps/web/app/(marketing)/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/admin/page.tsx`
- `apps/web/app/api/auth/platform/login/route.ts`

### `apps/portal`

This is the tenant-facing app that operators use.

Responsibilities:

- Dashboard, CRM, jobs, invoices, scheduler, onboarding, settings
- Tenant login/logout
- Public pages for quote, invoice, sign, enquiry, feedback
- Tenant integrations pages and callbacks
- Internal cron-style automation routes
- Webhook receivers for Xero and DocuSeal

Examples:

- `apps/portal/app/dashboard/page.tsx`
- `apps/portal/app/dashboard/onboarding/OnboardingWizard.tsx`
- `apps/portal/app/api/tenant/invoices/create/route.ts`
- `apps/portal/app/api/public/enquiry/route.ts`
- `apps/portal/app/api/webhooks/xero/route.ts`

### `apps/worker`

This is a standalone Node worker loop that processes automation jobs.

Responsibilities:

- Poll pending automation jobs
- Execute automation handlers
- Retry failures with backoff
- Emit structured logs and heartbeat events

Entry point:

- `apps/worker/src/index.ts`

## 5. Shared Package Responsibilities

### `@flowlab/contracts`

Purpose:

- Shared TypeScript types
- Zod schemas for inputs
- Plan features and automation descriptors
- Environment validation helpers
- Domain helpers

Important files:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/server.ts`

This package defines:

- tenant plans and statuses
- business types
- integration services and statuses
- automation preference keys and recipe descriptors
- `TenantSession`, `PlatformSession`, `TenantContext`
- public input schemas like signup, login, enquiry, feedback
- env helpers like `ensureAppEnv()`
- domain helpers like `buildTenantUrl()`

### `@flowlab/db`

Purpose:

- Prisma client singleton
- All database access and most business orchestration logic
- Tenant resolution
- CRUD + workflow helper functions
- Automation queue persistence
- Seed logic

Important files:

- `packages/db/prisma/schema.prisma`
- `packages/db/src/index.ts`
- `packages/db/prisma/seed.ts`

This is the heaviest package in the repo. It is more than a database adapter. It also contains application orchestration logic such as:

- resolving the current tenant from host
- creating tenants and owners
- creating enquiries, quotes, jobs, invoices
- syncing invoices from Xero
- scheduling automation jobs
- rate limiting
- demo seed creation

### `@flowlab/auth`

Purpose:

- Supabase server/admin client creation
- legacy bcrypt compatibility during migration
- customer JWT token signing and verification
- impersonation token helpers

Important files:

- `packages/auth/src/index.ts`
- `packages/auth/src/supabase-server.ts`

Current auth mode:

- User sessions are Supabase Auth sessions.
- Legacy password hashes still exist for lazy migration of older users.
- Public resource tokens still use custom JWTs in some flows.

### `@flowlab/automation`

Purpose:

- claim/process/retry queued automation jobs
- send notifications
- fire Make.com webhooks
- run worker loop

Important file:

- `packages/automation/src/index.ts`

### `@flowlab/integrations`

Purpose:

- Xero client logic
- Brevo email/SMS helpers
- DocuSeal helpers
- Google Maps helpers
- Claude quote generation
- credential encryption/decryption
- Make blueprint payload generation

Important files:

- `packages/integrations/src/index.ts`
- `packages/integrations/src/xero.ts`
- `packages/integrations/src/claude.ts`
- `packages/integrations/src/google-maps.ts`
- `packages/integrations/src/bom.ts`

### `@flowlab/events`

Purpose:

- Append-only platform event logging into `PlatformEventLog`

Important file:

- `packages/events/src/index.ts`

### `@flowlab/branding`

Purpose:

- Convert a `TenantContext` into CSS variables and display branding

Important file:

- `packages/branding/src/index.ts`

### `@flowlab/ui`

Purpose:

- Shared display primitives and formatting helpers

Important file:

- `packages/ui/src/index.ts`

The UI package is intentionally small. A lot of app-specific UI still lives inside each app.

## 6. How Multi-Tenancy Works

This is the most important architectural concept in FlowLab.

### Tenant resolution is host-based

The tenant app uses the incoming request host to determine which tenant the request belongs to.

Main flow:

1. Middleware reads the incoming host.
2. In development, `?tenant=<slug>` or the `__flowlab_dev_tenant` cookie can override host-based routing.
3. Middleware injects `x-flowlab-host` into forwarded request headers.
4. Server Components and Route Handlers use that header to resolve the tenant context.
5. `resolveTenantContext(host)` looks up either:
   - `TenantProfile.customDomain`, or
   - `<slug>.<root-domain>`

Key files:

- `apps/portal/middleware.ts`
- `apps/portal/lib/tenant.ts`
- `packages/db/src/index.ts` via `resolveTenantContext()`

### Tenant context includes branding and plan

The resolved context contains:

- `tenantId`
- `slug`
- `host`
- `customDomain`
- `isCustomDomain`
- `plan`
- `status`
- `branding`

This lets the portal change theme, routing, and business logic per tenant.

### Tenant isolation is enforced at two levels

Application layer:

- Every important query is scoped by `tenantId`.

Database layer:

- Row-level security exists and is tested.
- See `packages/db/migrations/001_rls.sql`
- See `tests/tenant-isolation.test.ts`

Practical rule for a GPT:

- Never describe FlowLab as a single shared dashboard with loose account filtering.
- It is a tenant-resolved product where the host determines the business context.

## 7. Authentication Model

FlowLab has two real user scopes and one public/customer token scope.

### Platform users

Used in `apps/web`.

Model:

- `PlatformUser`

Session logic:

- `apps/web/lib/session.ts`

Login route:

- `apps/web/app/api/auth/platform/login/route.ts`

Behavior:

- The app signs users in with Supabase Auth.
- It confirms the authenticated Supabase user maps to a `PlatformUser`.
- Legacy hashed passwords are lazily migrated into Supabase users on first login.

### Tenant users

Used in `apps/portal`.

Model:

- `TenantUser`

Session logic:

- `apps/portal/lib/session.ts`

Login route:

- `apps/portal/app/api/auth/tenant/login/route.ts`

Behavior:

- The portal resolves the tenant from host.
- It finds the `TenantUser` inside that tenant.
- It signs in through Supabase Auth.
- It verifies the signed-in auth user belongs to that tenant.

Important implication:

- Email alone is not enough. The tenant host matters.

### Impersonation

Platform admins can impersonate tenants.

Mechanism:

- An impersonation JWT is stored in `flowlab_impersonation`.
- `getTenantSession()` verifies the token matches the tenant and auth user.
- If it does not match, the user is signed out and the cookie is deleted.

### Public/customer resource tokens

Used for customer-facing routes like quote acceptance, invoice payment redirects, signing, and feedback.

There are two patterns in the repo:

- Raw stored access tokens on models like `Quote`, `Agreement`, and `Invoice`
- Signed JWT customer tokens for feedback links

Examples:

- Quotes use `Quote.accessToken`
- Invoices use `Invoice.accessToken`
- Feedback links use `signCustomerToken()` and `verifyCustomerToken()`

Important GPT nuance:

- Do not assume every public route uses the same token mechanism.
- Feedback uses signed JWT payloads.
- Quote/invoice/sign flows currently look up by persisted `accessToken`.

## 8. Data Model: The Important Tables

Schema file:

- `packages/db/prisma/schema.prisma`

### Tenant and identity layer

- `Tenant`: account, plan, status, billing
- `TenantProfile`: branding, colors, contact info, domain, timezone
- `TenantUser`: operator users inside a tenant
- `PlatformUser`: superadmin/support users
- `TenantIntegration`: per-tenant integration state and credentials
- `PlatformIntegration`: platform-level integration state

### Core operating entities

- `Customer`
- `Enquiry`
- `Service`
- `Quote`
- `Job`
- `Agreement`
- `Invoice`
- `Communication`
- `Feedback`

### Operational intelligence entities

- `PricingRate`
- `ServiceRateTemplate`
- `WorkSchedule`
- `TimeOff`
- `PersonalCommitment`
- `TimeEstimateHistory`
- `RebookReminder`

### Platform and safety entities

- `PlatformEventLog`
- `AutomationJob`
- `AutomationPreference`
- `TenantApiKey`
- `RateLimitBucket`

## 9. Core Object Relationships

The most important relationship story is:

1. A public enquiry can create or update a `Customer`.
2. That enquiry can later link to a `Quote`.
3. A `Quote` can be accepted and lead to:
   - a `Job`
   - an `Agreement`
4. A `Job` can later link to exactly one `Invoice`.
5. `Communication` records can attach to customer, job, or invoice context.
6. `Feedback` can attach to a completed job.

Important integrity rules visible in schema:

- `Job.quoteId` is unique.
- `Invoice.jobId` is unique.
- `Enquiry.quoteId` is unique.
- `Quote.accessToken`, `Agreement.accessToken`, `Invoice.accessToken` are unique.
- `TenantIntegration` is unique per `(tenantId, service)`.
- `AutomationPreference` is unique per `(tenantId, key)`.

Important product rule:

- Invoice records are mirrors of Xero invoices, not the primary accounting source.

## 10. The Main User Flows In Code

### Self-signup

Files:

- `apps/web/app/signup/page.tsx`
- `apps/web/app/signup/SignupForm.tsx`
- `packages/db/src/index.ts` via `createTenantWithOwner()`

Flow:

1. User submits signup form.
2. Server validates with Zod.
3. Honeypot and form timing bot guard run.
4. Turnstile is verified on the server.
5. Supabase admin creates the auth user.
6. `createTenantWithOwner()` creates:
   - `Tenant`
   - `TenantProfile`
   - `TenantUser`
   - default `TenantIntegration` rows
7. Optional Vercel domain registration happens.
8. Optional welcome email is sent.
9. User is redirected to getting started.

### Tenant login

Files:

- `apps/portal/app/api/auth/tenant/login/route.ts`
- `apps/portal/lib/session.ts`

Flow:

1. Resolve tenant from host.
2. Rate limit by tenant plus IP.
3. Validate credentials.
4. Lazy-migrate legacy users if necessary.
5. Sign in via Supabase.
6. Update `lastLoginAt`.

### Public enquiry

Files:

- `apps/portal/app/api/public/enquiry/route.ts`
- `packages/db/src/index.ts` via `createEnquiry()`

Flow:

1. Public enquiry form posts multipart form data.
2. Zod validates input.
3. Honeypot and timing guard run.
4. Rate limit by tenant plus IP.
5. `createEnquiry()` upserts/creates the customer and inserts the enquiry.
6. Automation batch is triggered immediately.

### Invoice creation

Files:

- `apps/portal/app/api/tenant/invoices/create/route.ts`

Flow:

1. Require tenant session.
2. Validate customer and amount.
3. Load tenant Xero credentials.
4. Upsert contact to Xero first.
5. Create Xero invoice second.
6. Only after Xero succeeds, create local `Invoice`.
7. Update the related `Job` to `invoiced`.
8. Enqueue automation job `invoice.created`.
9. Run an automation batch.

This is one of the clearest examples of FlowLab’s design rule:

- external source of truth first
- local mirror second

### Quote acceptance

Files:

- `apps/portal/app/(public)/quote/[token]/page.tsx`
- `apps/portal/app/api/public/quote/[token]/accept/route.ts`

Flow:

1. Load quote by public token.
2. Rate limit acceptance attempts.
3. Mark quote accepted in DB.
4. Run automations, including downstream agreement or notification logic.

### Feedback request and submission

Files:

- `packages/automation/src/index.ts` generates feedback links
- `packages/db/src/index.ts` via `getFeedbackRequestByToken()` and `submitFeedbackByToken()`

Flow:

1. Automation generates a signed feedback JWT containing tenant, job, type, and expiry.
2. Public feedback page verifies JWT and expiry.
3. Feedback is written against the job and customer.
4. Customer rating average is recomputed.

## 11. Automation System

This is a major part of the product.

### Storage model

Table:

- `AutomationJob`

Fields that matter:

- `kind`
- `status`
- `payloadJson`
- `availableAt`
- `attempts`
- `lastError`
- `dedupeKey`

### Queue lifecycle

Main functions live in `packages/db/src/index.ts`:

- `enqueueRecurringAutomationJobs()`
- `claimPendingAutomationJobs()`
- `completeAutomationJob()`
- `failAutomationJob()`
- `retryAutomationJob()`

Processing lives in `packages/automation/src/index.ts`:

- `processAutomationBatch()`
- `startAutomationWorker()`

### Automation behavior

The processor:

1. Enqueues recurring jobs.
2. Claims available pending jobs.
3. Executes each job via a switch on `job.kind`.
4. Marks success as `completed`.
5. Marks failure as `pending` again with exponential backoff, or `dead_letter` after max attempts.

Retry characteristics:

- Max attempts is 5.
- Backoff is exponential and capped at 15 minutes.

Dead-letter behavior:

- Terminal failures emit an event log
- Structured worker logs include `AUTOMATION_TERMINAL_FAILURE`

### Recurring job scheduling

Recurring jobs are not hard-coded in Vercel config right now. The code supports:

- trial expiry
- morning digest
- weekly analysis

Scheduler logic is timezone-aware per tenant and uses `TenantProfile.timezone`.

Important nuance:

- `apps/portal/vercel.json` currently has `"crons": []`
- The runbook discusses cron routes, but the current checked-in Vercel config does not define them
- The worker also calls `enqueueRecurringAutomationJobs()` directly

A GPT should treat the automation system as real, but should not claim that Vercel cron configuration is currently present in source unless it verifies deployment settings elsewhere.

## 12. External Integrations

### Xero

Most important integration.

Purpose:

- contacts
- invoices
- webhook sync

Key files:

- `packages/integrations/src/xero.ts`
- `apps/portal/app/api/tenant/integrations/xero/route.ts`
- `apps/portal/app/api/tenant/integrations/xero/callback/route.ts`
- `apps/portal/app/api/webhooks/xero/route.ts`
- `apps/web/app/api/integrations/xero/callback/route.ts`

Rules:

- Xero is the invoice source of truth.
- Local invoices mirror Xero state.
- Customer records can store `xeroContactId`.
- Invoices can store `xeroInvoiceId`, `xeroStatus`, `xeroSyncedAt`.
- Token refresh is automatic in the client helpers.

Webhook behavior:

- Xero webhook verifies HMAC signature using `XERO_WEBHOOK_KEY`
- It finds the tenant by Xero tenant ID
- It syncs the invoice from Xero into local state

### DocuSeal

Purpose:

- agreement templates
- signature requests
- agreement completion webhook

Key files:

- `packages/integrations/src/index.ts`
- `apps/portal/app/api/webhooks/docuseal/route.ts`
- agreement template routes in `apps/portal/app/api/tenant/agreements/templates/*`

Important behavior:

- Tenants can have uploaded/generated agreement templates
- DocuSeal webhook marks agreements signed
- Agreement completion can trigger automation

### Brevo

Used under legacy integration service names:

- `twilio` means Brevo SMS
- `sendgrid` means Brevo Email

This mapping is intentional and documented in `packages/contracts/src/index.ts`.

GPT rule:

- Do not “fix” the persisted enum names in explanations unless the user is asking about a migration. Explain that the friendly provider is Brevo, while the DB-compatible enum names remain legacy.

### Make.com

Purpose:

- optional advanced webhook automation
- recipe/blueprint payloads

Used by automation handlers to fire tenant-configured webhooks if enabled.

### Google Maps and BOM

Purpose:

- route optimization
- weather risk assessment

These are helper integrations used by scheduling/orchestration logic in `@flowlab/db`.

### Claude

Purpose:

- AI quote generation

See:

- `packages/integrations/src/claude.ts`
- `apps/portal/app/api/tenant/quotes/generate/route.ts`

## 13. Platform Event Logging

FlowLab logs platform activity into `PlatformEventLog`.

Helper:

- `packages/events/src/index.ts` via `logPlatformEvent()`

This is used for:

- integration API calls
- webhook receipts/failures
- worker heartbeats
- mobile sync events
- retry/dead-letter signals

When the GPT explains observability, it should mention:

- structured stdout logs exist
- event rows are also persisted in the database

## 14. API Route Patterns

FlowLab route handlers follow a consistent pattern.

Typical route shape:

1. Require a session if tenant/admin-only
2. Parse body via JSON or `FormData`
3. Validate using Zod from `@flowlab/contracts/server`
4. Rate limit if public or auth-sensitive
5. Call a function in `@flowlab/db`
6. Trigger automation batch if downstream actions are expected
7. Redirect or return JSON

Patterns to remember:

- Public form routes often use `FormData` and redirect
- Internal routes use bearer auth via `CRON_SECRET`
- Webhook routes verify signatures before parsing or acting
- Session helpers are app-specific: platform in `apps/web`, tenant in `apps/portal`

## 15. Frontend Conventions

### App Router and server-first pages

Most pages are async Server Components.

Examples:

- dashboard pages fetch directly from `@flowlab/db`
- session checks happen in the page or layout

Client components are used where needed for:

- interactive onboarding wizard
- forms with local state
- embedded builders

### Theming

Portal theming is tenant-driven.

How it works:

1. Layout loads tenant theme
2. CSS variables are injected into `<body>`
3. Global CSS references those variables

Key files:

- `apps/portal/app/layout.tsx`
- `apps/portal/app/globals.css`
- `packages/branding/src/index.ts`

### Fonts and feel

Both apps currently use:

- `Plus_Jakarta_Sans` for headings/body
- `DM_Mono` for monospace accents

### Shared UI

The shared UI package is intentionally thin. It provides:

- badge
- button
- card
- input
- section title
- stat
- format helpers
- status tone helpers

Portal also has a local `components/ui/` folder for app-specific primitives.

GPT rule:

- Do not assume the UI is fully centralized in `@flowlab/ui`.
- There is a mixed model: shared package plus local app components.

## 16. Validation, Bot Guards, and Rate Limiting

### Validation

Validation lives in `packages/contracts/src/server.ts` via Zod.

Used for:

- signup
- login
- public enquiry
- feedback submission
- token params
- admin actions

### Bot protection

Used in public and signup flows:

- honeypot field `website`
- minimum form age guard via `formStartedAt`
- Cloudflare Turnstile on signup

### Rate limiting

Storage:

- `RateLimitBucket`

Used for:

- signup
- platform login
- tenant login
- public enquiry
- quote acceptance
- invoice payment redirect

Implementation lives in `packages/db/src/index.ts` via `consumeRateLimit()`.

## 17. Environment Model

See:

- `.env.example`
- `packages/contracts/src/server.ts`
- `docs/RUNBOOK.md`

Core required envs by app:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `ENCRYPTION_MASTER_KEY`
- `DEFAULT_ROOT_DOMAIN`

Portal and worker additionally require:

- `CRON_SECRET`

Supabase-related envs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Other important envs:

- `XERO_*`
- `DOCUSEAL_*`
- `BREVO_*`
- `GOOGLE_MAPS_API_KEY`
- `ANTHROPIC_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `SENTRY_DSN`

Behavioral note:

- `ensureAppEnv()` is enforced only in production runtime, not during build-time prerender.

## 18. Database and Prisma Conventions

### Prisma client lifecycle

The DB package uses a global Prisma singleton in development to avoid hot-reload duplication.

See:

- `packages/db/src/index.ts`

### Schema source of truth

Schema:

- `packages/db/prisma/schema.prisma`

Generate client:

```bash
npm run db:generate
```

Push schema:

```bash
npm run db:push
```

Seed demo tenant:

```bash
npm run db:seed
```

### Seed expectations

The demo seed creates DB records but not necessarily all Supabase auth state ahead of time.

Important note from code:

- passwords are managed by Supabase Auth
- demo DB users can rely on lazy migration or manual auth setup

Seed helper:

- `ensureDemoSeed()` in `packages/db/src/index.ts`

## 19. Testing Strategy

### Unit and pure behavior tests

Tools:

- Vitest

Files:

- `tests/foundation.test.ts`
- `tests/hardening.test.ts`
- `tests/integrations/xero.test.ts`

These cover:

- plan features
- encryption
- blueprint generation
- env enforcement
- token semantics
- validation schemas
- Xero client behavior

### Database security tests

File:

- `tests/tenant-isolation.test.ts`

This verifies RLS behavior and tenant isolation against a real database when enabled.

### Browser smoke test

Tool:

- Playwright

File:

- `tests/e2e/smoke.test.ts`

## 20. Coding Style And Project Conventions

Patterns visible in source:

- TypeScript strict mode is on.
- Most business logic is centralized in `@flowlab/db`, not scattered across route handlers.
- Zod schemas live in shared contracts.
- Route handlers stay relatively thin and orchestration-heavy work is delegated to package functions.
- Server Components are used by default.
- Public routes often use redirect-based UX rather than JSON APIs.
- Status strings are mostly plain enums or normalized string unions, not elaborate class hierarchies.

A GPT should prefer to explain the codebase in that style:

- practical
- service-function-driven
- schema-backed
- host-aware
- workflow-oriented

## 21. Important Invariants A GPT Should Never Contradict

1. FlowLab is multi-tenant and host-resolved.
2. Xero is the source of truth for invoices.
3. Tenant queries must be scoped by `tenantId`.
4. Public customer actions are rate-limited and tokenized.
5. FlowLab uses Supabase Auth for real sessions.
6. Legacy password hashing still exists only as a migration bridge.
7. Automation jobs are persistent DB-backed queue records, not in-memory tasks.
8. The worker retries failed jobs and can dead-letter them.
9. Branding is tenant-specific and applied through CSS variables.
10. The shared UI package is small; much UI still lives inside app folders.

## 22. Current Repo Quirks Worth Knowing

These are not necessarily bugs, but they matter when describing the codebase accurately.

- README says Turborepo, but the repo currently shows npm workspaces only.
- `apps/portal/vercel.json` currently has no cron entries even though the runbook describes recurring cron endpoints.
- `vitest.config.ts` aliases point to `/Users/mitch/FlowLab Solutions_White/...` rather than the current `.recovered` directory, so test config should be checked carefully if tests misbehave in this workspace copy.
- Integration service enum names `twilio` and `sendgrid` are still used for Brevo-backed SMS/email behavior for compatibility.
- Public token handling is mixed: some routes use stored opaque tokens, while feedback uses signed JWT payloads.

## 23. Quick Lookup Map For A GPT

If the user asks about a topic, start here:

- “How does tenant routing work?”
  - `apps/portal/middleware.ts`
  - `apps/portal/lib/tenant.ts`
  - `packages/db/src/index.ts` via `resolveTenantContext()`

- “How does login work?”
  - `apps/portal/app/api/auth/tenant/login/route.ts`
  - `apps/web/app/api/auth/platform/login/route.ts`
  - `apps/portal/lib/session.ts`
  - `apps/web/lib/session.ts`

- “How are tenants created?”
  - `apps/web/app/signup/page.tsx`
  - `packages/db/src/index.ts` via `createTenantWithOwner()`

- “How does invoicing work?”
  - `apps/portal/app/api/tenant/invoices/create/route.ts`
  - `packages/integrations/src/xero.ts`
  - `packages/db/prisma/schema.prisma` model `Invoice`

- “How do public enquiry/quote/invoice flows work?”
  - `apps/portal/app/api/public/enquiry/route.ts`
  - `apps/portal/app/(public)/quote/[token]/page.tsx`
  - `apps/portal/app/api/public/quote/[token]/accept/route.ts`
  - `apps/portal/app/(public)/invoice/[token]/page.tsx`
  - `apps/portal/app/api/public/invoice/[token]/pay/route.ts`

- “How do automations work?”
  - `packages/automation/src/index.ts`
  - `packages/db/src/index.ts` queue helpers
  - `apps/worker/src/index.ts`

- “How are integrations stored?”
  - `packages/db/prisma/schema.prisma` model `TenantIntegration`
  - `packages/db/src/index.ts` integration helpers
  - `packages/integrations/src/index.ts`

- “How is branding applied?”
  - `packages/branding/src/index.ts`
  - `apps/portal/app/layout.tsx`
  - `apps/portal/app/globals.css`

- “What tests prove the architecture?”
  - `tests/foundation.test.ts`
  - `tests/hardening.test.ts`
  - `tests/tenant-isolation.test.ts`
  - `tests/integrations/xero.test.ts`

## 24. Best Summary

FlowLab is a server-first, TypeScript monorepo for a multi-tenant field service SaaS. The portal is host-resolved per tenant, auth is Supabase-based with a lazy migration bridge, the database model is explicit and relational, invoicing is Xero-first, and background business behavior is driven by a persisted automation queue processed by either internal routes or a dedicated worker.

If a Custom GPT keeps those truths straight, it will describe FlowLab accurately.
