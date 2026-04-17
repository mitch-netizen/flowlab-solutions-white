import { getMobileJobSnapshot } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { MobileJobApp } from "../../../components/mobile-job-app";
import { requireTenantSession } from "../../../lib/session";

export default async function MobilePage() {
  const session = await requireTenantSession();
  const jobs = await getMobileJobSnapshot(session.tenantId);

  return (
    
      <DashboardPageScaffold
        eyebrow="Jobs"
        title="Field view"
        description="Manage today&apos;s jobs from on-site. Start timers, log completion notes, and sync status back when you&apos;re done."
        section="jobs"
      >
      <MobileJobApp
        jobs={jobs.map((job) => ({
          id: job.id,
          summary: job.summary,
          suburb: job.suburb,
          status: job.status,
          scheduledFor: job.scheduledFor?.toISOString() ?? null,
          customerId: job.customer.id,
          customerName: `${job.customer.firstName} ${job.customer.lastName}`
        }))}
      />
    </DashboardPageScaffold>
  );
}
