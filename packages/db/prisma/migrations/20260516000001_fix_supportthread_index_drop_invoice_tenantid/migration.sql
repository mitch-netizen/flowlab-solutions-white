-- Restore SupportThread(status, updatedAt) — the superadmin inbox queries
-- by status alone (no tenantId) and orders by updatedAt; the remaining
-- (tenantId, status) index cannot serve that cross-tenant access pattern.
CREATE INDEX IF NOT EXISTS "SupportThread_status_updatedAt_idx"
  ON "SupportThread"("status", "updatedAt" DESC);

-- Drop Invoice(tenantId) — redundant because @@unique([tenantId, number])
-- already creates a B-tree index with tenantId as the leading column,
-- which Postgres can use for WHERE tenantId = ? queries.
DROP INDEX IF EXISTS "Invoice_tenantId_idx";
