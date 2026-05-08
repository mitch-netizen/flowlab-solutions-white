ALTER TABLE "Tenant" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "stripeSubscriptionStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "stripePriceId" TEXT;

CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
