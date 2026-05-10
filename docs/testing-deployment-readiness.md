# Testing and Deployment Readiness

FlowLab features that touch onboarding, integrations, maps, billing/usage, AI, or tenant isolation must pass the full CI path before deployment.

## Required PR checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma` against CI Postgres

Provider-dependent tests should use mocks or deterministic fallbacks. CI must not require live Brevo, DocuSeal, Google Maps, Claude, Stripe, or Xero availability.

## Required staging checks

- Signup creates a tenant with expanded trade defaults.
- Tenant onboarding can confirm a service area using mocked or staging-safe Maps credentials.
- Tenant can create a customer/enquiry and generate a quote without API-key setup.
- Integrations page renders platform-managed services without exposing decrypted credentials.
- Xero OAuth uses FlowLab app credentials and stores only tenant organisation tokens on tenant records.
- Dashboard renders recommended next actions.

## Required production smoke checks

- Platform login and tenant login.
- Public enquiry page.
- Tenant onboarding page.
- Dashboard overview and Action Inbox.
- Quote generation page.
- Scheduler page.
- Integrations page.
- Public quote acceptance route.

## Security checks

- Tenant isolation tests must cover integration records, usage events, action suggestions, service-area metadata, OAuth state, and event logs.
- Logs, test snapshots, and client payloads must never include decrypted provider credentials.
