ALTER TABLE "Feedback"
ADD COLUMN "jobId" TEXT;

CREATE UNIQUE INDEX "Feedback_jobId_key" ON "Feedback"("jobId");

ALTER TABLE "Feedback"
ADD CONSTRAINT "Feedback_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_key_key" ON "RateLimitBucket"("key");
CREATE INDEX "RateLimitBucket_scope_windowStart_idx" ON "RateLimitBucket"("scope", "windowStart");
