CREATE TABLE "PlatformIntegration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "service" "IntegrationService" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'not_configured',
    "credentialsJson" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "lastErrorMessage" TEXT,
    "webhookUrl" TEXT,
    "oauthAccessToken" TEXT,
    "oauthRefreshToken" TEXT,
    "oauthExpiresAt" TIMESTAMP(3),

    CONSTRAINT "PlatformIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformIntegration_service_key" ON "PlatformIntegration"("service");
