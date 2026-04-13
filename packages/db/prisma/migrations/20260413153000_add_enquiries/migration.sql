CREATE TABLE "Enquiry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "quoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceRequest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'public_form',
  "convertedAt" TIMESTAMP(3),

  CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enquiry_quoteId_key" ON "Enquiry"("quoteId");
CREATE INDEX "Enquiry_tenantId_createdAt_idx" ON "Enquiry"("tenantId", "createdAt");
CREATE INDEX "Enquiry_tenantId_status_createdAt_idx" ON "Enquiry"("tenantId", "status", "createdAt");
CREATE INDEX "Enquiry_customerId_createdAt_idx" ON "Enquiry"("customerId", "createdAt");

ALTER TABLE "Enquiry"
ADD CONSTRAINT "Enquiry_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enquiry"
ADD CONSTRAINT "Enquiry_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enquiry"
ADD CONSTRAINT "Enquiry_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
