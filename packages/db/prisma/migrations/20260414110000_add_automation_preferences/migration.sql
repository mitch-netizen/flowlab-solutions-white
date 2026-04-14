CREATE TABLE "AutomationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationPreference_tenantId_key_key" ON "AutomationPreference"("tenantId", "key");
CREATE INDEX "AutomationPreference_tenantId_enabled_idx" ON "AutomationPreference"("tenantId", "enabled");

ALTER TABLE "AutomationPreference"
  ADD CONSTRAINT "AutomationPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
