ALTER TABLE "Communication"
ADD COLUMN "jobId" TEXT,
ADD COLUMN "invoiceId" TEXT;

ALTER TABLE "AutomationJob"
ADD COLUMN "dedupeKey" TEXT;

UPDATE "Communication"
SET "customerId" = NULL
WHERE "customerId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Customer"
    WHERE "Customer"."id" = "Communication"."customerId"
  );

CREATE UNIQUE INDEX "AutomationJob_dedupeKey_key" ON "AutomationJob"("dedupeKey");
CREATE INDEX "Communication_tenantId_customerId_createdAt_idx" ON "Communication"("tenantId", "customerId", "createdAt");
CREATE INDEX "Communication_tenantId_jobId_createdAt_idx" ON "Communication"("tenantId", "jobId", "createdAt");
CREATE INDEX "Communication_tenantId_invoiceId_createdAt_idx" ON "Communication"("tenantId", "invoiceId", "createdAt");

ALTER TABLE "Communication"
ADD CONSTRAINT "Communication_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Communication"
ADD CONSTRAINT "Communication_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Communication"
ADD CONSTRAINT "Communication_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
