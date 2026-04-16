# FlowLab Solutions — Operations Runbook

## Deployment

### Vercel environment variables

Both Next.js apps (`apps/web` and `apps/portal`) are deployed to separate Vercel projects. Set the following environment variables in each project's Vercel dashboard (or via `vercel env`).

**Core (all apps)**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Transaction pooler connection string — port 6543, append `?pgbouncer=true` (see Database section) |
| `DIRECT_URL` | Session pooler connection string — port 5432, no pgbouncer flag |
| `JWT_SECRET` | Secret used to sign tenant session JWTs |
| `ENCRYPTION_MASTER_KEY` | Master key for field-level encryption |
| `DEFAULT_ROOT_DOMAIN` | Canonical platform domain, e.g. `flowlabsolutions.au` |
| `CRON_SECRET` | Bearer token checked by `/api/internal/*` cron routes (portal + worker only) |

**Supabase**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only, never exposed to the browser) |

**Email / SMS (Brevo)**

| Variable | Description |
|---|---|
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_FROM_EMAIL` | Sending email address |
| `BREVO_FROM_NAME` | Sending display name |
| `BREVO_SMS_SENDER` | SMS sender ID |
| `BREVO_SMS_ORGANISATION_PREFIX` | Prefix prepended to SMS messages |
| `BREVO_SANDBOX_MODE` | Set to `"true"` in staging to suppress real sends |

**Optional integrations**

| Variable | Description |
|---|---|
| `XERO_CLIENT_ID` | Xero OAuth app client ID |
| `XERO_CLIENT_SECRET` | Xero OAuth app client secret |
| `XERO_REDIRECT_URI` | Must match the callback URL registered in Xero developer portal |
| `XERO_WEBHOOK_KEY` | Xero webhook signing key |
| `DOCUSEAL_API_KEY` | DocuSeal API key for e-signature |
| `DOCUSEAL_API_BASE_URL` | DocuSeal API base URL (default `https://api.docuseal.com`) |
| `DOCUSEAL_WEBHOOK_SECRET_KEY` / `DOCUSEAL_WEBHOOK_SECRET_VALUE` | DocuSeal webhook HMAC verification |
| `DOCUSEAL_APP_BASE_URL` | DocuSeal viewer base URL |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (server) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (browser) |
| `SENTRY_DSN` | If set, enables Sentry error reporting |

### Worker host setup

The worker process runs from the repo root with `npm run dev:worker` in development or `npm run start -w @flowlab/worker` in production. It requires the same core env vars as the portal app (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ENCRYPTION_MASTER_KEY`, `DEFAULT_ROOT_DOMAIN`, `CRON_SECRET`). If `SENTRY_DSN` is set, the worker also reports top-level crashes to Sentry. The worker calls `enqueueRecurringAutomationJobs` directly rather than going through the HTTP cron route.

### Supabase project setup

1. Create a new Supabase project. Note the project reference, URL, anon key, and service-role key.
2. In **Authentication → URL Configuration**, add your Vercel deployment URLs to the allow-list.
3. Enable Row Level Security on all tables — the app assumes RLS is active.
4. Run `npx prisma migrate deploy` with `DIRECT_URL` pointing at the session pooler (port 5432) on first deploy and after each schema change.

---

## Database

### Connection string format

Supabase exposes two pooler endpoints for each project.

**`DATABASE_URL`** — transaction pooler, port 6543. Used by the app for all normal queries via PgBouncer. Must include `?pgbouncer=true` to disable Prisma's prepared-statement mode:

```
postgresql://<user>:<password>@<host>:6543/<db>?pgbouncer=true
```

**`DIRECT_URL`** — session pooler (or direct connection), port 5432. Used by Prisma migrations and any operation that requires a persistent session:

```
postgresql://<user>:<password>@<host>:5432/<db>
```

Both variables are set in `packages/contracts/src/server.ts` (`appEnvRequirements`) as required for all apps.

---

## Trial-to-paid

### How trial expiry works

The billing automation job runs as part of the recurring automation pipeline:

1. **Cron schedule** — Vercel calls `POST /api/internal/automation/enqueue-recurring` every 15 minutes (configured in `apps/portal/vercel.json`).
2. **Enqueue** — The route calls `enqueueRecurringAutomationJobs()` (from `packages/db/src/index.ts`), which inspects each tenant's preferences and timezone and creates `AutomationJob` rows for any jobs due to run.
3. **Process** — A separate cron (`POST /api/internal/automation/process`, every 5 minutes) dequeues and executes pending jobs. The `billing.trial_expired` job type is handled in `packages/automation/src/index.ts` and transitions the tenant's `status` to `suspended` when the trial period has elapsed.

### Manually clearing a suspension

To reinstate a tenant without waiting for a payment flow:

1. Open the **Supabase dashboard** → Table Editor → `Tenant` table.
2. Find the tenant row by `slug` or `id`.
3. Set `status` to `'active'`.
4. Save. The change takes effect immediately on the next request.

Alternatively, use the internal admin API (`PATCH /api/admin/tenants/:id` with `{ "status": "active" }`) if you have a valid `superadmin` session.

### Setting monthlyFee

`monthlyFee` is a `Decimal` column on the `Tenant` table (in cents or dollars depending on your convention — check `packages/contracts/src/server.ts` `adminTenantUpdateSchema` for the allowed range: 0–100 000). Update it via the admin API or directly in the Supabase dashboard.

---

## Xero

### Reconnect flow

If a Xero connection expires or is revoked:

1. In the tenant portal, navigate to **Settings → Integrations**.
2. Click **Disconnect** on the Xero tile to clear stored tokens.
3. Click **Connect Xero** to restart the OAuth 2.0 authorisation code flow.
4. After completing the Xero consent screen the callback at `/api/integrations/xero/callback` (web app) exchanges the code for tokens and stores them encrypted in the database.

### Token expiry recovery

Xero access tokens expire after 30 minutes; refresh tokens expire after 60 days. The app refreshes the access token automatically on each API call. If the refresh token has expired (> 60 days without use):

1. The next Xero API call will fail with a 401.
2. The tenant will see a connection-error state in Settings → Integrations.
3. Follow the **Reconnect flow** above to re-authorise.

---

## Custom domains

Custom domain support is documented as a post-launch feature. The current platform runs all tenants on `<slug>.flowlabsolutions.au`.

A `verify-domain` route exists at `apps/portal/app/api/tenant/settings/verify-domain/route.ts` for future use. It is not wired to any UI or DNS verification flow yet.

---

## Health endpoints

Both apps expose `/api/health`.

```
HTTP 200
Content-Type: application/json

// web
{ "ok": true, "db": "ok" }

// portal
{ "ok": true, "db": "ok", "supabase": "ok" }
```

If a dependency is down, the route returns `503` with the failed checks marked as `"error"`. These endpoints are safe for uptime monitoring and do not require authentication.

---

## Monitoring

### Sentry

Set the `SENTRY_DSN` environment variable on `apps/web`, `apps/portal`, and the worker host to enable Sentry error reporting. When absent, Sentry stays disabled and the apps continue using structured stdout logs only.

### Structured log alerts

The automation processor emits structured JSON logs to stdout. The key alert to monitor for terminal automation failures is:

```
alert: "AUTOMATION_TERMINAL_FAILURE"
```

Example grep command for log aggregators or SSH sessions:

```bash
# Stream portal logs and filter for terminal automation failures
grep 'AUTOMATION_TERMINAL_FAILURE' /var/log/flowlab/portal.log
```

This alert fires when an `AutomationJob` exhausts all retry attempts and is marked `dead_letter`. Triage by checking the `AutomationJob` table for rows with `status = 'dead_letter'` and reviewing the `lastError` column.
