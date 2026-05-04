ALTER TABLE "PlatformUser" ADD COLUMN "authUserId" TEXT;
ALTER TABLE "TenantUser" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "PlatformUser_authUserId_key" ON "PlatformUser"("authUserId");
CREATE UNIQUE INDEX "TenantUser_authUserId_key" ON "TenantUser"("authUserId");
