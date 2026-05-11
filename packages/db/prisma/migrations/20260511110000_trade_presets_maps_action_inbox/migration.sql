ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'plumbing';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'hvac';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'roofing';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'painting';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'carpentry';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'glazing';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'locksmith';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'garage_doors';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'landscaping';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'pressure_washing';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'gutter_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'tree_services';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'fencing';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'residential_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'commercial_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'bond_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'carpet_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'window_cleaning';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'fire_safety';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'test_and_tag';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'mobile_mechanic';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'appliance_repair';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'solar';
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'security_systems';

DO $$ BEGIN
  CREATE TYPE "IntegrationManagementMode" AS ENUM ('platform_managed', 'tenant_managed', 'connected_account', 'advanced_optional');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TenantProfile"
  ADD COLUMN IF NOT EXISTS "serviceBaseAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceBasePlaceId" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceBaseLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "serviceBaseLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION;

ALTER TABLE "TenantIntegration"
  ADD COLUMN IF NOT EXISTS "managementMode" "IntegrationManagementMode" NOT NULL DEFAULT 'tenant_managed';

UPDATE "TenantIntegration"
SET "managementMode" = CASE
  WHEN "service" IN ('claude', 'google_maps', 'docuseal', 'twilio', 'sendgrid', 'stripe') THEN 'platform_managed'::"IntegrationManagementMode"
  WHEN "service" = 'xero' THEN 'connected_account'::"IntegrationManagementMode"
  WHEN "service" = 'make_com' THEN 'advanced_optional'::"IntegrationManagementMode"
  ELSE "managementMode"
END
WHERE "credentialsJson" IS NULL;

CREATE TABLE IF NOT EXISTS "TenantUsageEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "service" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metadataJson" TEXT,
  CONSTRAINT "TenantUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantUsageEvent_tenantId_createdAt_idx" ON "TenantUsageEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantUsageEvent_tenantId_service_createdAt_idx" ON "TenantUsageEvent"("tenantId", "service", "createdAt");

ALTER TABLE "TenantUsageEvent"
  ADD CONSTRAINT "TenantUsageEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantUsageEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON "TenantUsageEvent" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "tenant_isolation" ON "TenantUsageEvent" AS PERMISSIVE FOR ALL TO authenticated USING ("tenantId" = (SELECT current_setting(''app.tenant_id''::text, true))) WITH CHECK ("tenantId" = (SELECT current_setting(''app.tenant_id''::text, true)))';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ActionSuggestion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "suggestedAction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "snoozedUntil" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "sourceId" TEXT,
  CONSTRAINT "ActionSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActionSuggestion_tenantId_status_createdAt_idx" ON "ActionSuggestion"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ActionSuggestion_tenantId_category_createdAt_idx" ON "ActionSuggestion"("tenantId", "category", "createdAt");

ALTER TABLE "ActionSuggestion"
  ADD CONSTRAINT "ActionSuggestion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActionSuggestion" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON "ActionSuggestion" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "tenant_isolation" ON "ActionSuggestion" AS PERMISSIVE FOR ALL TO authenticated USING ("tenantId" = (SELECT current_setting(''app.tenant_id''::text, true))) WITH CHECK ("tenantId" = (SELECT current_setting(''app.tenant_id''::text, true)))';
  END IF;
END $$;
