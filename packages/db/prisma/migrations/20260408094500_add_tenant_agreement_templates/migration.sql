-- Create agreement template storage for tenant-managed DocuSeal templates
CREATE TABLE "TenantAgreementTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "sourceFileName" TEXT NOT NULL,
  "sourceMimeType" TEXT,
  "signerMode" TEXT NOT NULL DEFAULT 'customer_only',
  "signerRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "docusealTemplateId" TEXT NOT NULL,
  "docusealTemplateSlug" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "lastSyncedAt" TIMESTAMP(3),
  "lastErrorMessage" TEXT,
  CONSTRAINT "TenantAgreementTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Agreement"
ADD COLUMN "contractTemplateId" TEXT,
ADD COLUMN "signingUrl" TEXT;

CREATE UNIQUE INDEX "TenantAgreementTemplate_tenantId_docusealTemplateId_key"
ON "TenantAgreementTemplate"("tenantId", "docusealTemplateId");

CREATE INDEX "TenantAgreementTemplate_tenantId_isDefault_idx"
ON "TenantAgreementTemplate"("tenantId", "isDefault");

ALTER TABLE "TenantAgreementTemplate"
ADD CONSTRAINT "TenantAgreementTemplate_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Agreement"
ADD CONSTRAINT "Agreement_contractTemplateId_fkey"
FOREIGN KEY ("contractTemplateId") REFERENCES "TenantAgreementTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
