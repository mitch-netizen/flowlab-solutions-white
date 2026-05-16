-- Drop redundant single-column FK indexes on Communication —
-- superseded by the composite (tenantId, <col>, createdAt) indexes
DROP INDEX IF EXISTS "Communication_customerId_idx";
DROP INDEX IF EXISTS "Communication_jobId_idx";
DROP INDEX IF EXISTS "Communication_invoiceId_idx";

-- Drop unused indexes with no matching query patterns
DROP INDEX IF EXISTS "Quote_customerId_idx";
DROP INDEX IF EXISTS "Agreement_customerId_idx";
DROP INDEX IF EXISTS "Agreement_contractTemplateId_idx";
DROP INDEX IF EXISTS "AutomationPreference_tenantId_enabled_idx";
DROP INDEX IF EXISTS "SupportThread_status_updatedAt_idx";

-- Add missing tenantId index on Invoice — queried by tenantId constantly
-- but only had an index on customerId
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
