-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN "emailSignatureEnabled" BOOLEAN NOT NULL DEFAULT TRUE;

-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN "emailSignatureAdHocDefault" BOOLEAN NOT NULL DEFAULT TRUE;

-- AlterTable
ALTER TABLE "TenantProfile" ADD COLUMN "emailSignatureCustomHtml" TEXT;
