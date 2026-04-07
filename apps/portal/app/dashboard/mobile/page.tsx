import { getMobileJobSnapshot } from "@flowlab/db";

import { MobileJobApp } from "../../../components/mobile-job-app";
import { requireTenantSession } from "../../../lib/session";

export default async function MobilePage() {
  const session = await requireTenantSession();
  const jobs = await getMobileJobSnapshot(session.tenantId);

  return (
    <MobileJobApp
      jobs={jobs.map((job) => ({
        id: job.id,
        summary: job.summary,
        suburb: job.suburb,
        status: job.status,
        scheduledFor: job.scheduledFor?.toISOString() ?? null,
        customerName: `${job.customer.firstName} ${job.customer.lastName}`
      }))}
    />
  );
}
