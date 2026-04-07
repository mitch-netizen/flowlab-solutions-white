# FlowLab Solutions

Multi-tenant white-label field service automation platform scaffolded as an npm-workspaces monorepo.

## Workspaces

- `apps/web`: marketing site, signup flow, and FlowLab superadmin
- `apps/portal`: tenant dashboard, onboarding, integrations, system health, and customer-facing routes
- `apps/worker`: async worker entrypoint
- `packages/*`: shared contracts, data access, auth, branding, integrations, events, and UI

## Quick start

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:push`.
5. Run `npm run db:seed`.
6. Start apps with `npm run dev:web` and `npm run dev:portal`.

## Current implementation focus

This initial build establishes:

- multi-tenant schema and seed data
- host-aware tenant resolution
- custom JWT auth utilities
- superadmin and tenant dashboard shells
- onboarding, integrations, system health, and public portal foundations
- worker and event logging scaffolding
