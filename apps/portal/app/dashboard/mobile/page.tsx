import { getMobileJobSnapshot } from "@flowlab/db";

import DashboardPageHeader from "../../../components/dashboard-page-header";
import { MobileJobApp } from "../../../components/mobile-job-app";
import { requireTenantSession } from "../../../lib/session";

export default async function MobilePage() {
  const session = await requireTenantSession();
  const jobs = await getMobileJobSnapshot(session.tenantId);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Workspace"
        title="Run jobs from the field, even when reception drops out."
        description="The mobile workspace keeps actions moving while the operator is on-site. Timers, completion notes, and sync status stay visible in one place."
        section="workspace"
      />
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
    </div>
  );
}
