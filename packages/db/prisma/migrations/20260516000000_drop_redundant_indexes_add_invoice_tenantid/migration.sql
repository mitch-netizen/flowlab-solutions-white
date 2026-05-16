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

-- Note: SupportThread_status_updatedAt_idx is intentionally kept —
-- the superadmin inbox queries by status alone (no tenantId) and orders
-- by updatedAt; the (tenantId, status) index cannot serve that pattern.

-- Note: Invoice already has @@unique([tenantId, number]) which provides a
-- B-tree index with tenantId as the leading column — no additional
-- single-column tenantId index is needed.
