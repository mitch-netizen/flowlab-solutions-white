-- =============================================================================
-- Add FK-covering indexes for all unindexed foreign key columns
-- Applied via Supabase MCP (idx_fk_coverage migration) and reflected here
-- so prisma migrate stays consistent with the live database.
-- =============================================================================

-- Quote
CREATE INDEX IF NOT EXISTS "Quote_tenantId_idx" ON "Quote"("tenantId");
CREATE INDEX IF NOT EXISTS "Quote_customerId_idx" ON "Quote"("customerId");

-- Agreement
CREATE INDEX IF NOT EXISTS "Agreement_tenantId_idx" ON "Agreement"("tenantId");
CREATE INDEX IF NOT EXISTS "Agreement_customerId_idx" ON "Agreement"("customerId");
CREATE INDEX IF NOT EXISTS "Agreement_contractTemplateId_idx" ON "Agreement"("contractTemplateId") WHERE "contractTemplateId" IS NOT NULL;

-- Invoice
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");

-- Communication (tenantId+X composites exist but tenantId is leading — standalone needed for FK checks)
CREATE INDEX IF NOT EXISTS "Communication_customerId_idx" ON "Communication"("customerId") WHERE "customerId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Communication_jobId_idx" ON "Communication"("jobId") WHERE "jobId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Communication_invoiceId_idx" ON "Communication"("invoiceId") WHERE "invoiceId" IS NOT NULL;

-- Feedback
CREATE INDEX IF NOT EXISTS "Feedback_tenantId_idx" ON "Feedback"("tenantId");
CREATE INDEX IF NOT EXISTS "Feedback_customerId_idx" ON "Feedback"("customerId");

-- RebookReminder
CREATE INDEX IF NOT EXISTS "RebookReminder_tenantId_dueAt_idx" ON "RebookReminder"("tenantId", "dueAt");
CREATE INDEX IF NOT EXISTS "RebookReminder_customerId_idx" ON "RebookReminder"("customerId");

-- PricingRate
CREATE INDEX IF NOT EXISTS "PricingRate_tenantId_idx" ON "PricingRate"("tenantId");

-- ServiceRateTemplate
CREATE INDEX IF NOT EXISTS "ServiceRateTemplate_tenantId_idx" ON "ServiceRateTemplate"("tenantId");

-- TimeEstimateHistory
CREATE INDEX IF NOT EXISTS "TimeEstimateHistory_tenantId_createdAt_idx" ON "TimeEstimateHistory"("tenantId", "createdAt");

-- WorkSchedule
CREATE INDEX IF NOT EXISTS "WorkSchedule_tenantId_idx" ON "WorkSchedule"("tenantId");

-- TimeOff
CREATE INDEX IF NOT EXISTS "TimeOff_tenantId_idx" ON "TimeOff"("tenantId");

-- PersonalCommitment
CREATE INDEX IF NOT EXISTS "PersonalCommitment_tenantId_idx" ON "PersonalCommitment"("tenantId");

-- TenantApiKey
CREATE INDEX IF NOT EXISTS "TenantApiKey_tenantId_idx" ON "TenantApiKey"("tenantId");

-- AutomationJob
CREATE INDEX IF NOT EXISTS "AutomationJob_tenantId_idx" ON "AutomationJob"("tenantId") WHERE "tenantId" IS NOT NULL;
