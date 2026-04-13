ALTER TABLE "Invoice"
ADD COLUMN "jobId" TEXT;

CREATE UNIQUE INDEX "Invoice_jobId_key" ON "Invoice"("jobId");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
