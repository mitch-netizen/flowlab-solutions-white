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
--     Feedback: INSERT only (customer submitting rating after a job)
--     All other tables: no policy → access denied.
--
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER: reusable policy names are scoped per-table so no conflicts arise
-- ---------------------------------------------------------------------------

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
  USING (id = current_setting('app.tenant_id', true)::text);

-- =============================================================================
-- TENANT-SCOPED TABLES  (service_role + authenticated tenant isolation)
-- =============================================================================

-- Macro: each tenant-scoped table gets two policies:
--   1. service_role: full access
--   2. authenticated: rows where tenantId = app.tenant_id

-- TenantProfile
ALTER TABLE "TenantProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantProfile"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantProfile"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TenantIntegration (contains OAuth tokens — authenticated read is intentional)
ALTER TABLE "TenantIntegration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantIntegration"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantIntegration"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TenantUser
ALTER TABLE "TenantUser" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantUser"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantUser"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TenantApiKey (hashed keys only, but still tenant-scoped)
ALTER TABLE "TenantApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantApiKey"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantApiKey"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TenantAgreementTemplate
ALTER TABLE "TenantAgreementTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TenantAgreementTemplate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TenantAgreementTemplate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Customer"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Customer"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Service
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Service"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Service"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Job
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Job"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Job"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Communication
ALTER TABLE "Communication" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Communication"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Communication"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- RebookReminder
ALTER TABLE "RebookReminder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "RebookReminder"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "RebookReminder"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- PricingRate
ALTER TABLE "PricingRate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PricingRate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "PricingRate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- ServiceRateTemplate
ALTER TABLE "ServiceRateTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "ServiceRateTemplate"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "ServiceRateTemplate"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TimeEstimateHistory
ALTER TABLE "TimeEstimateHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TimeEstimateHistory"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TimeEstimateHistory"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- WorkSchedule
ALTER TABLE "WorkSchedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "WorkSchedule"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "WorkSchedule"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- TimeOff
ALTER TABLE "TimeOff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "TimeOff"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "TimeOff"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- PersonalCommitment
ALTER TABLE "PersonalCommitment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "PersonalCommitment"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "PersonalCommitment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- =============================================================================
-- PUBLIC-ACCESSIBLE TABLES  (token-gated reads + limited anon writes)
-- =============================================================================

-- Quote — customers view their quote via a one-time accessToken link
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Quote"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Quote"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
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
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
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
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
CREATE POLICY "public_read_by_token" ON "Invoice"
  AS PERMISSIVE FOR SELECT TO anon
  USING ("accessToken" IS NOT NULL);

-- Feedback — customers submit ratings after a job (anon INSERT, no SELECT)
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "Feedback"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "tenant_isolation" ON "Feedback"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);
-- Public: INSERT only — customers submit a rating but cannot read others
CREATE POLICY "public_insert_feedback" ON "Feedback"
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);

-- =============================================================================
-- VERIFICATION QUERY (run manually to confirm)
-- =============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
