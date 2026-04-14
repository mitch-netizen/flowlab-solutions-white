-- =============================================================================
-- FlowLab Solutions — Row-Level Security
-- =============================================================================
-- Strategy:
--
--   • ALL tables have RLS enabled (no unprotected table)
--
--   • service_role (Prisma app server, Supabase dashboard, MCP):
--     Full bypass via explicit PERMISSIVE policy on every table.
--     The postgres superuser also bypasses RLS natively.
--
--   • authenticated (future Supabase Auth / direct client):
--     Tenant-scoped tables restricted to rows matching
--     current_setting('app.tenant_id', true).
--     Platform-only tables: no policy → access denied.
--
--   • anon (public customers, token-based pages):
--     Quote, Agreement, Invoice: SELECT only where accessToken IS NOT NULL
--     All other tables: no policy → access denied.
--
-- Performance note:
--   All current_setting() calls are wrapped in (SELECT ...) so Postgres
--   evaluates them once per statement (init plan) rather than once per row.
--   Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- =============================================================================

-- =============================================================================
-- PLATFORM-ONLY TABLES  (service_role exclusively)
-- =============================================================================

-- PlatformUser — superadmin credentials, never tenant-visible
ALTER TABLE "PlatformUser" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PlatformUser"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- PlatformIntegration — platform-level Xero/Stripe OAuth tokens
ALTER TABLE "PlatformIntegration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PlatformIntegration"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- PlatformEventLog — cross-tenant audit log
ALTER TABLE "PlatformEventLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PlatformEventLog"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- AutomationJob — worker queue, internal only
ALTER TABLE "AutomationJob" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "AutomationJob"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RateLimitBucket — internal rate-limit state
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "RateLimitBucket"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TENANT ROOT
-- =============================================================================

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON "Tenant"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users may only read their own tenant record
CREATE POLICY "tenant_self_read" ON "Tenant"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = (SELECT current_setting('app.tenant_id'::text, true)));

-- =============================================================================
-- TENANT-SCOPED TABLES  (service_role + authenticated tenant isolation)
-- =============================================================================
--
-- Each table gets two policies:
--   1. service_role_all  — full access for Prisma / app server
--   2. tenant_isolation  — rows where tenantId matches the session variable
--
-- current_setting() is wrapped in (SELECT ...) on every policy so the
-- planner hoists it to a single evaluation per query (init plan).

-- TenantProfile
ALTER TABLE "TenantProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantProfile"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantProfile"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TenantIntegration (contains OAuth tokens — authenticated read is intentional)
ALTER TABLE "TenantIntegration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantIntegration"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantIntegration"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TenantUser
ALTER TABLE "TenantUser" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantUser"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantUser"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TenantApiKey (hashed keys only, but still tenant-scoped)
ALTER TABLE "TenantApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantApiKey"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantApiKey"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TenantAgreementTemplate
ALTER TABLE "TenantAgreementTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantAgreementTemplate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantAgreementTemplate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Customer"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Customer"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- Service
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Service"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Service"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- Job
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Job"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Job"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- Communication
ALTER TABLE "Communication" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Communication"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Communication"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- RebookReminder
ALTER TABLE "RebookReminder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "RebookReminder"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "RebookReminder"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- PricingRate
ALTER TABLE "PricingRate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PricingRate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "PricingRate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- ServiceRateTemplate
ALTER TABLE "ServiceRateTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "ServiceRateTemplate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "ServiceRateTemplate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TimeEstimateHistory
ALTER TABLE "TimeEstimateHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TimeEstimateHistory"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TimeEstimateHistory"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- WorkSchedule
ALTER TABLE "WorkSchedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "WorkSchedule"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "WorkSchedule"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- TimeOff
ALTER TABLE "TimeOff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TimeOff"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TimeOff"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- PersonalCommitment
ALTER TABLE "PersonalCommitment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PersonalCommitment"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "PersonalCommitment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- Enquiry — inbound leads from the public enquiry form (written server-side via Prisma)
ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Enquiry"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Enquiry"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- AutomationPreference — per-tenant toggle for each automation kind
ALTER TABLE "AutomationPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "AutomationPreference"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "AutomationPreference"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- =============================================================================
-- PUBLIC-ACCESSIBLE TABLES  (token-gated reads)
-- =============================================================================

-- Quote — customers view their quote via a one-time accessToken link
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Quote"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Quote"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));
-- Public: read-only via accessToken (the token itself is the auth)
CREATE POLICY "public_read_by_token" ON "Quote"
  AS PERMISSIVE FOR SELECT TO anon
  USING ("accessToken" IS NOT NULL);

-- Agreement — customers view/sign via accessToken link
ALTER TABLE "Agreement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Agreement"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Agreement"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));
CREATE POLICY "public_read_by_token" ON "Agreement"
  AS PERMISSIVE FOR SELECT TO anon
  USING ("accessToken" IS NOT NULL);

-- Invoice — customers view/pay via accessToken link
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Invoice"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Invoice"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));
CREATE POLICY "public_read_by_token" ON "Invoice"
  AS PERMISSIVE FOR SELECT TO anon
  USING ("accessToken" IS NOT NULL);

-- Feedback — customers submit ratings via /api/public/feedback/[token] (server-side Prisma)
-- No direct anon access needed — all writes go through service_role via the Next.js handler.
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Feedback"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Feedback"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)))
  WITH CHECK ("tenantId" = (SELECT current_setting('app.tenant_id'::text, true)));

-- =============================================================================
-- VERIFICATION QUERY (run manually to confirm)
-- =============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
