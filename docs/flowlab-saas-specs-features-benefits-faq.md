# FlowLab Solutions SaaS Specs, Features, Benefits, and FAQ

Last reviewed: 2026-05-07

This document is the canonical plain-English reference for the FlowLab Solutions SaaS product in this repository. It combines product positioning, technical specs, current features, benefits, integrations, pricing, onboarding, and frequently asked questions.

Source notes:

- Product and sales copy: `docs/one-pager.md`, `apps/web/app/(marketing)/page.tsx`
- Technical architecture: `README.md`, `docs/custom-gpt-codebase-guide.md`, `docs/RUNBOOK.md`
- Plan limits and feature flags: `packages/contracts/src/index.ts`
- Onboarding and integration guidance: `docs/custom-gpt-onboarding-guide.md`

## Maintenance Instructions For LLMs And Coding Agents

This document must stay current with the product. If you are Claude, Gemini, Codex, ChatGPT, Copilot, another LLM, or any coding agent working in this repository, treat this document as part of the source of truth for FlowLab SaaS product knowledge.

Update this document in the same change whenever you add, remove, rename, or materially change any of the following:

- user-facing features, workflows, pages, dashboard areas, public/customer surfaces, or mobile behavior
- plan names, prices, limits, feature flags, attribution rules, trial terms, or billing assumptions
- supported business types, pricing models, quote behavior, job lifecycle states, or onboarding requirements
- integrations, OAuth behavior, API/webhook behavior, automation preferences, automation recipes, or external service dependencies
- architecture, runtime surfaces, shared packages, database model, auth model, tenant isolation, monitoring, health checks, environment variables, or deployment assumptions
- caveats, known limitations, unsupported claims, or FAQ answers

Before finishing a product or platform change, check whether the change affects this document. If it does, update the relevant sections and refresh the `Last reviewed` date. If the change does not affect the document, no edit is required.

Do not leave this document stale while changing the product. Do not make claims in this document that are not supported by the current codebase or active product positioning.

## Executive Summary

FlowLab Solutions is a white-label SaaS platform for Australian sole operators and small field service teams. It gives operators a branded, end-to-end operations hub for the full customer lifecycle:

1. Customer enquiry
2. Customer record
3. Quote
4. Agreement
5. Scheduled job
6. Job completion
7. Xero invoice
8. Payment follow-up
9. Feedback, review, and rebook automation

The platform is built for operators who currently run work through disconnected tools such as WhatsApp, spreadsheets, manual calendars, Xero, paper agreements, and ad hoc customer follow-up.

FlowLab's core promise is simple: one connected platform, under the operator's brand, from first enquiry to paid invoice.

## Who FlowLab Is For

FlowLab is built for sole operators and small teams doing repeatable field service work.

Primary fit:

- Lawn mowing
- Cleaning
- Pest control
- Gardening
- Handyman services
- Pool service
- Pressure washing
- Similar local service trades

Best-fit businesses usually:

- quote regularly
- schedule recurring or repeat work
- invoice through Xero
- need customer follow-up but do not have office staff
- want customer-facing pages under their own brand
- need a cleaner operational record than messaging apps and spreadsheets can provide

FlowLab is especially useful for operators who are strong at the work itself but are losing time, leads, or cash flow through admin friction.

## The Problem FlowLab Solves

Most small field service businesses grow before their back office does. The owner ends up using several disconnected systems:

- enquiries through WhatsApp, phone, email, social DMs, or website forms
- quotes written manually or sent as rough messages
- jobs tracked in a spreadsheet or calendar
- invoices created later in Xero
- agreements handled manually or skipped
- reviews and rebooking left to memory

This creates predictable problems:

- leads slip through because enquiries are not captured cleanly
- quotes take too long or are inconsistent
- customers accept work without a clear agreement
- job status is unclear across the week
- invoices go out late
- follow-up does not happen consistently
- the owner cannot see what is quoted, scheduled, completed, invoiced, or paid without checking multiple systems

FlowLab connects these steps so each record carries forward into the next one.

## Product Positioning

FlowLab is not a generic CRM, scheduler, or accounting add-on. It is a white-label operations layer for small field service teams.

The product is organized around five connected areas:

| Area | Purpose |
| --- | --- |
| Overview | Morning brief, jobs on today, outstanding tasks, key numbers |
| CRM | Customer records, enquiries, communication history, feedback |
| Jobs | Swim-lane job board, job cards, scheduling, mobile field view |
| Revenue | Xero-backed invoices, payment status, billing trail |
| Setup | Integrations, automations, branding, settings, system health |

The product principle is explicit linkage:

- a customer has one Xero Contact where applicable
- a job links to the customer and operating history
- a quote can carry forward into a job and agreement
- an invoice links to one Xero Invoice
- automations are logged and auditable

FlowLab avoids fuzzy matching and guessing where operational records should be explicit.

## Key Features

### Branded Workspace

Each tenant gets a branded workspace with its own business profile, colors, and customer-facing surfaces.

Current plan behavior:

- Starter uses a FlowLab subdomain for customer-facing pages.
- Professional and Growth support custom-domain positioning and remove FlowLab branding.

### CRM Built For Field Service

The CRM keeps each customer in one place:

- contact details
- enquiries
- job history
- communications
- feedback
- billing context

Benefit: when a customer calls or enquires again, the operator can see the relationship and history without searching through old messages.

### Branded Customer Enquiry

Customers can submit enquiries through a branded form. Enquiries arrive in the CRM pre-formatted and ready to quote.

Benefit: operators avoid missed DMs, duplicate message threads, inbox triage, and retyping customer information.

### AI-Powered Quoting

FlowLab supports AI-assisted quoting from operator-defined pricing rules.

The user describes the job, chooses area or condition where relevant, and FlowLab drafts a quote using configured rates.

Supported pricing models:

| Business type | Pricing model |
| --- | --- |
| Lawn mowing | Area-based |
| Gardening | Area-based |
| Cleaning | Hourly |
| Handyman | Hourly |
| Pool service | Hourly |
| Pest control | Flat-rate |
| Other | Flat-rate |

Benefit: most quote drafts can be prepared quickly and consistently while still allowing the operator to review and adjust before sending.

### Job Board And Scheduling

FlowLab tracks work through a field-service job lifecycle:

Quoted -> Scheduled -> In Progress -> Complete -> Invoiced -> Paid

Job cards link the operational pieces together:

- customer
- quote
- agreement
- schedule
- notes
- invoice
- communication trail

Benefit: the operator can scan what is happening today, what is blocked, and what needs to move forward.

### Scheduler And Mobile Job App

FlowLab includes a schedule view and mobile field experience for on-the-road work.

Mobile job actions include:

- start timer
- stop timer
- checklist updates
- photo actions
- status updates

The mobile app is designed so field updates can be made from site without requiring a laptop.

### Xero Invoicing

Xero is the invoice source of truth. When FlowLab creates an invoice, it calls Xero first and stores the local invoice as a mirror of the Xero record.

Current behavior:

- Xero OAuth 2.0 connection
- token refresh
- Xero Contact linkage
- Xero Invoice linkage
- invoices created as authorised where supported by the flow
- payment status sync capability

Benefit: operators do not need to copy job details into Xero manually, and the accounting record stays clean.

### Digital Agreements

DocuSeal handles service agreements and signatures.

Typical flow:

1. Customer accepts a quote.
2. FlowLab generates or sends the agreement through DocuSeal.
3. Customer signs on their device.
4. Signed agreement is stored against the job.

Benefit: operators get a clearer paper trail without printing, chasing, or manually filing PDFs.

### Automated Follow-Up

FlowLab includes built-in automation preferences for common field-service workflows.

Built-in automations:

| Automation | Channel | Default |
| --- | --- | --- |
| Enquiry confirmation | Email | On |
| Booking confirmation | SMS + Email | On |
| Day-before job reminder | SMS + Email | On |
| Invoice reminders | SMS | On |
| Feedback requests | SMS | On |
| Review requests after 5-star feedback | SMS | On |
| Rebook reminders | SMS | On |
| Daily operator brief | SMS + Email | On |
| Weekly learning analysis | Internal | On |

Advanced automation:

| Automation | Channel | Default |
| --- | --- | --- |
| Send FlowLab events to Make.com | Webhook | Off |

Benefit: operators can recover repeat work, improve review flow, and reduce manual chasing without needing office admin.

### Automation Recipes

FlowLab groups common automation setups into recipes:

| Recipe | Purpose | Enables |
| --- | --- | --- |
| Operator essentials | Keep the owner informed and customers reassured | Enquiry confirmation, booking confirmation, day-before reminder, morning digest |
| Cash flow booster | Help invoices get paid without awkward manual follow-up | Invoice reminders, morning digest |
| Growth follow-up | Keep the pipeline warm after completed work | Feedback requests, review requests, rebook reminders |

### Make.com Blueprint Pack

Make.com is optional and intended for advanced workflows. It is not required for core FlowLab operation.

Blueprints currently described in code:

- New enquiry
- Quote accepted
- Agreement signed
- Job scheduled
- Day-before reminder
- On my way
- Schedule update
- Job complete
- Payment reminder day 3
- Payment reminder day 7
- Payment overdue day 14
- Post-job feedback
- Review request
- Rebook reminder
- Time estimate learning
- Weather check

Benefit: teams that want to push FlowLab events into Slack, Sheets, Airtable, Notion, or other systems can do so without turning Make.com into a requirement for everyone.

### Daily Brief And Weekly Learning

FlowLab supports operator-facing intelligence:

- daily brief with schedule, overdue invoices, and priorities
- weekly analysis of historical jobs
- pricing and scheduling suggestions where enough data exists

Benefit: the owner starts the day with operational context and can improve rates over time.

## Benefits

### For The Business Owner

- less admin at night
- fewer missed enquiries
- faster quoting
- clearer job visibility
- cleaner invoice flow
- less manual payment chasing
- more consistent customer follow-up
- a more professional branded customer experience

### For Customers

- clearer enquiry and quote process
- branded approval links
- booking confirmations
- reminders before scheduled work
- digital agreements
- fewer communication gaps

### For Cash Flow

- invoices are created from job records
- payment reminders can run automatically
- paid/unpaid status is easier to see
- overdue work is surfaced in operator briefs

### For Growth

- customer history is retained
- review requests can be triggered after positive feedback
- rebook reminders help bring recurring work back
- operators can handle more admin volume before adding staff

## Plans And Pricing

All plans currently include a 14-day free trial with no credit card required.

| Plan | Price | Best for | Included limits and capabilities |
| --- | --- | --- | --- |
| Starter | $79/month | Solo operators getting started | FlowLab subdomain, full CRM/job board/quoting/invoicing, 50 jobs/month, 50 AI-assisted quotes/month, Xero connection, enquiry forms, digital agreements, FlowLab branding on customer-facing pages |
| Professional | $149/month | Operators who want custom domain support and no FlowLab branding | Custom domain support, no FlowLab branding, full CRM/job board/quoting/invoicing, 200 jobs/month, 200 AI-assisted quotes/month, Make.com automation pack |
| Growth | $249/month | Small teams needing more scale and integrations | Custom domain, unlimited jobs, unlimited AI quotes, multi-user team access, API access, priority support, no FlowLab branding |

Plan feature flags:

| Capability | Starter | Professional | Growth |
| --- | --- | --- | --- |
| Custom domain | No | Yes | Yes |
| Remove FlowLab attribution | No | Yes | Yes |
| Multi-user access | No | No | Yes |
| API access | No | No | Yes |
| Jobs per month | 50 | 200 | Unlimited |
| AI quotes per month | 50 | 200 | Unlimited |

## Integrations

### Xero

Purpose: invoicing, contacts, payment status, billing trail.

Xero is the invoicing source of truth. FlowLab stores Xero IDs and mirrors the invoice record rather than treating local invoice data as the primary accounting record.

### DocuSeal

Purpose: digital service agreements and signatures.

DocuSeal is used when quotes need agreements and signed PDFs stored against jobs.

### Brevo SMS

Purpose: customer and operator SMS messages.

Used for reminders, confirmations, feedback requests, review requests, rebook reminders, invoice reminders, and operator briefs.

### Brevo Email

Purpose: transactional email.

Used for enquiry confirmations, booking confirmations, agreement or invoice communication, operator email briefs, and other customer updates.

### Claude AI

Purpose: AI-assisted quoting, scheduling, and learning.

Claude support is treated as FlowLab-managed AI capability in the current product context.

### Google Maps

Purpose: location and routing-related support where enabled.

Google Maps is part of the integration set and may support service area, address, route, or travel-time workflows.

### Make.com

Purpose: optional advanced automation.

Make.com is for teams that want FlowLab events pushed into external tools. It should be presented as optional, not as a requirement for the core product.

### Stripe

Stripe exists in shared integration type definitions, but current onboarding guidance says not to present Stripe as part of the current onboarding path.

## Technical Specifications

### Architecture

FlowLab is a TypeScript monorepo with three main runtime surfaces:

| Surface | Purpose |
| --- | --- |
| `apps/web` | Marketing site, signup, FlowLab superadmin |
| `apps/portal` | Tenant dashboard and customer-facing tenant portal |
| `apps/worker` | Async job processor |

Shared packages:

| Package | Purpose |
| --- | --- |
| `@flowlab/db` | Prisma schema, migrations, typed query functions |
| `@flowlab/auth` | JWT utilities and session helpers |
| `@flowlab/integrations` | Xero, DocuSeal, Make.com, Brevo, Google Maps, BOM, and other integration clients |
| `@flowlab/automation` | Workflow trigger logic and job processing |
| `@flowlab/branding` | Tenant theme and white-label configuration |
| `@flowlab/contracts` | Shared TypeScript types, Zod schemas, feature flags, automation descriptors |
| `@flowlab/events` | Event bus and audit/platform event logging |
| `@flowlab/ui` | Shared component library |

### Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth with `@supabase/ssr`, plus lazy migration from bcrypt |
| Multi-tenancy | Host-based tenant resolution |
| Row security | Supabase Row Level Security on tables |
| Invoicing | Xero API with OAuth 2.0 |
| Agreements | DocuSeal |
| Automation | Internal queue and optional Make.com webhooks |
| Monorepo | npm workspaces and Turborepo |
| Monitoring | Sentry when `SENTRY_DSN` is configured, structured stdout logs |

### Multi-Tenancy

FlowLab is multi-tenant and host-resolved. Each tenant has its own tenant context, plan, status, branding profile, and isolated data.

Tenant isolation is enforced by:

- explicit `tenantId` scoping in application queries
- Supabase Row Level Security
- tenant-aware sessions and route handling

The platform should not be described as a single shared dashboard with loose account filtering.

### Authentication

FlowLab uses Supabase Auth for real sessions.

User scopes:

- platform users for superadmin/platform management
- tenant users for business-owner and team access
- customer token scope for public quote, agreement, invoice, and feedback links

### Database

The Prisma schema lives in `packages/db/prisma/schema.prisma`.

Important entities include:

- Tenant
- TenantUser
- Customer
- Job
- Invoice
- Quote
- Communication
- Feedback
- Integration
- AuditLog
- AutomationJob
- PlatformEventLog

### Automation Runtime

The automation pipeline uses persisted jobs.

Typical lifecycle:

1. Events or recurring schedules enqueue automation jobs.
2. Processor dequeues pending jobs.
3. Handler executes email, SMS, Xero, DocuSeal, Make.com, or internal work.
4. Attempts, failures, and terminal states are recorded.
5. Dead-letter failures are logged for operational triage.

Recurring automation currently includes trial expiry checks and scheduled operational jobs.

### Health Checks

Both apps expose `/api/health`.

Expected healthy responses:

- web: `{ "ok": true, "db": "ok" }`
- portal: `{ "ok": true, "db": "ok", "supabase": "ok" }`

If dependencies fail, the route returns `503` and marks failed checks as `"error"`.

### Core Environment Variables

Core variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Transaction-pooler PostgreSQL connection string |
| `DIRECT_URL` | Session/direct PostgreSQL connection string for migrations |
| `DEFAULT_ROOT_DOMAIN` | Canonical platform domain |
| `JWT_SECRET` | Tenant session JWT signing secret |
| `ENCRYPTION_MASTER_KEY` | Master key for encrypted fields |
| `CRON_SECRET` | Bearer token for internal cron routes |

Supabase variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase service role key |

Common integration variables:

| Variable | Purpose |
| --- | --- |
| `BREVO_API_KEY` | Brevo API access |
| `BREVO_FROM_EMAIL` | Sending email address |
| `BREVO_FROM_NAME` | Sending display name |
| `BREVO_SMS_SENDER` | SMS sender ID |
| `XERO_CLIENT_ID` | Xero OAuth app client ID |
| `XERO_CLIENT_SECRET` | Xero OAuth app client secret |
| `XERO_REDIRECT_URI` | Registered Xero OAuth callback |
| `XERO_WEBHOOK_KEY` | Xero webhook signing key |
| `DOCUSEAL_API_KEY` | DocuSeal API access |
| `ANTHROPIC_API_KEY` | Claude/Anthropic AI features |
| `GOOGLE_MAPS_API_KEY` | Google Maps support |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server-side validation |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile browser site key |
| `SENTRY_DSN` | Optional Sentry reporting |

## Onboarding Flow

The onboarding journey is designed to get a tenant from signup to ready for real enquiries.

Recommended sequence:

1. Business details
2. Branding
3. Services and pricing
4. Schedule
5. Tools and integrations
6. Go live

### Step 1: Business Details

Collect:

- business name
- tagline
- phone
- email
- service area suburbs
- business type

Business type matters because it affects quoting and pricing defaults.

### Step 2: Branding

Set:

- primary color
- accent color
- optional secondary color
- logo and business identity where available

These branding settings appear on customer-facing pages such as quotes, invoices, agreements, and enquiry forms.

### Step 3: Services And Pricing

Configure:

- pricing model
- minimum charge
- GST setting
- service templates
- default price and duration

Pricing setup is important because AI-assisted quoting depends on these business-specific rules.

### Step 4: Schedule

Configure:

- working days
- start and finish times
- availability rules

The schedule supports job planning and customer communication.

### Step 5: Tools And Integrations

Recommended priority:

1. Xero, if the business invoices through Xero
2. Brevo SMS and Brevo Email for customer communication
3. DocuSeal if agreements are needed
4. Make.com only for external workflows

### Step 6: Go Live

Launch tasks:

- preview the enquiry form
- publish the enquiry link on the business website or social channels
- send the first quote
- confirm automation preferences
- revisit custom domain after core setup if needed

## Current Product Caveats

- Custom-domain support is positioned in plans, but the runbook notes custom domains as a post-launch/future-wired area with a verification route present for future use.
- Make.com is optional advanced automation, not a dependency for normal product use.
- Stripe exists in shared integration definitions, but current onboarding guidance says not to present it as part of the current onboarding path.
- Public site positioning should be checked before publishing this document externally, because the live `flowlabsolutions.au` site may describe a broader service/install model rather than this SaaS product.

## FAQ

### What is FlowLab Solutions?

FlowLab Solutions is a white-label SaaS platform for sole operators and small field service teams. It connects customer enquiries, CRM, quotes, jobs, agreements, Xero invoices, automations, feedback, reviews, and rebooking into one branded operating platform.

### Is FlowLab a CRM?

FlowLab includes a CRM, but it is broader than a CRM. It also covers quoting, job scheduling, invoicing, agreements, automation, and customer follow-up.

### Is FlowLab built for large field service companies?

FlowLab is currently positioned for sole operators and small teams. Growth plan features support small teams with multi-user access and API access, but the product is not positioned as enterprise field-service management software.

### Which industries does FlowLab support?

The app currently supports lawn mowing, cleaning, pest control, gardening, handyman, pool service, and other field-service businesses.

### Does FlowLab replace Xero?

No. Xero remains the invoice source of truth. FlowLab creates and mirrors invoice records through Xero rather than replacing the accounting system.

### Does FlowLab require Xero?

FlowLab is designed around Xero-backed invoicing. It is strongest for businesses that use Xero or are willing to connect Xero for invoicing.

### Does FlowLab create invoices automatically?

FlowLab can create Xero-backed invoices from job records. The product principle is that invoices are linked to customers and jobs, with Xero holding the primary accounting record.

### Does FlowLab support digital signatures?

Yes. FlowLab uses DocuSeal for service agreements and signatures.

### Does FlowLab include AI?

Yes. FlowLab supports AI-assisted quoting and weekly learning analysis. AI uses the tenant's configured pricing and job history context rather than acting as a generic chatbot.

### Can operators review AI quotes before sending?

Yes. The marketing copy positions AI quoting as draft generation that the operator reviews, adjusts if needed, and sends.

### What automations are included?

FlowLab includes enquiry confirmations, booking confirmations, day-before reminders, invoice reminders, feedback requests, review requests, rebook reminders, daily operator briefs, and weekly analysis.

### What is Make.com used for?

Make.com is an optional advanced automation path. It lets teams send FlowLab events into external tools such as Slack, Sheets, Airtable, Notion, or other systems.

### Is Make.com required?

No. Make.com is optional and should not be presented as required for core FlowLab operation.

### Does FlowLab send SMS and email?

Yes. The current integration model uses Brevo SMS and Brevo Email for customer and operator communication.

### Does FlowLab support custom domains?

Professional and Growth plans include custom-domain positioning. The current runbook notes custom domains as a post-launch/future-wired area, so implementation status should be checked before making a hard external promise.

### Does FlowLab remove its own branding?

Professional and Growth plans remove FlowLab attribution. Starter includes FlowLab branding on customer-facing pages.

### What are the plan limits?

Starter includes 50 jobs and 50 AI-assisted quotes per month. Professional includes 200 jobs and 200 AI-assisted quotes per month. Growth includes unlimited jobs and AI-assisted quotes.

### Is there a free trial?

Yes. The product copy currently states a 14-day free trial with no credit card required.

### How long does setup take?

Public-facing copy says setup takes about ten minutes. In practice, setup depends on how ready the operator is with business details, pricing, branding, schedule, and integrations.

### What does a tenant need to set up first?

The recommended setup order is business details, branding, services and pricing, schedule, integrations, and enquiry form go-live.

### What is required for a good onboarding?

The core blockers are business name, business type, usable pricing setup, and a basic work schedule. Custom domain, Make.com, advanced automation tuning, and perfect brand polish can wait.

### Does FlowLab have a mobile app?

FlowLab includes a mobile job app experience for field updates. The manifest identifies it as "FlowLab Mobile Job App", and mobile job actions include timer, checklist, photo, and status updates.

### Does FlowLab work offline?

The portal copy says mobile field actions can queue locally when offline and sync back when connectivity returns. This should be verified in implementation before making strong external reliability claims.

### Is FlowLab multi-tenant?

Yes. FlowLab is a multi-tenant SaaS with host-based tenant resolution, tenant-scoped data, tenant-aware sessions, and Supabase Row Level Security.

### What technology is FlowLab built with?

FlowLab uses Next.js 15, React 19, TypeScript, PostgreSQL via Supabase, Prisma, Supabase Auth, Xero OAuth, DocuSeal, Brevo, Claude AI, and a persisted automation queue.

### How is tenant data isolated?

Tenant data is isolated through explicit `tenantId` scoping in application logic and Supabase Row Level Security at the database level.

### Does FlowLab have monitoring?

Yes. Both apps expose health endpoints, and Sentry can be enabled with `SENTRY_DSN`. The automation processor also emits structured logs, including terminal failure alerts.

### Who should not use FlowLab?

FlowLab is not the best fit for businesses that do not quote or schedule field work, do not need Xero-backed invoicing, require enterprise dispatch complexity from day one, or want a generic CRM unrelated to field-service workflows.

## Short Marketing Description

FlowLab gives sole operators and small field service teams a complete branded platform for CRM, AI quoting, job scheduling, digital agreements, Xero invoicing, and automated follow-up. It connects every step from first enquiry to paid invoice so operators can spend less time chasing admin and more time doing paid work.

## One-Line Description

FlowLab is a white-label field-service operations platform that connects enquiries, quotes, jobs, agreements, Xero invoices, and follow-up under the operator's own brand.
