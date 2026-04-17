import Link from "next/link";

import { getSchedulerRecommendations, getTenantSchedulerSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getJobPrimaryHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchedulerPage() {
  const session = await requireTenantSession();
  const [snapshot, recommendations] = await Promise.all([
    getTenantSchedulerSnapshot(session.tenantId),
    getSchedulerRecommendations(session.tenantId)
  ]);

  const totalBlocks = snapshot.commitments.length + snapshot.timeOff.length;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Jobs"
        title="Scheduler"
        description="See upcoming jobs alongside your availability, personal commitments, and time off — all in one view."
        section="jobs"
        actions={(
          <form action="/api/tenant/scheduler/analyze" method="post">
            <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
              Queue schedule analysis
            </button>
          </form>
        )}
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommendations</div>
            <div className="text-3xl font-semibold">{recommendations.length}</div>
            <p className="text-sm text-muted-foreground">Jobs the analysis thinks deserve attention first.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Upcoming jobs</div>
            <div className="text-3xl font-semibold">{snapshot.jobs.length}</div>
            <p className="text-sm text-muted-foreground">Jobs with a confirmed date and time.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Blocked time</div>
            <div className="text-3xl font-semibold">{totalBlocks}</div>
            <p className="text-sm text-muted-foreground">Personal commitments and time off logged against your schedule.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Recommendations</div>
            <h2>Scheduling recommendations</h2>
            <p>Jobs flagged by the analysis as needing attention — check the reason, then open the job to take action.</p>
          </div>
        </div>

        <div className="space-y-3">
          {recommendations.length > 0 ? recommendations.map((item) => (
            <div key={item.jobId} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${item.reasons.length > 0 ? "is-warning" : "is-off"}`}>
                    {item.reasons.length > 0 ? "Needs review" : "Suggested"}
                  </span>
                </div>
                <h3>
                  <Link className="inline-entity-link" href={getJobRecordHref(item.jobId)}>
                    {item.summary}
                  </Link>
                </h3>
                <p>
                  <CustomerLink customerId={item.customerId} className="inline-entity-link">
                    {item.customerName}
                  </CustomerLink>
                  {" · "}
                  {item.suggestedAction}
                </p>
                {item.reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.reasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={getJobRecordHref(item.jobId)}>Open job</Link>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No scheduling recommendations right now. The current plan looks stable.</p>}
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Work week</div>
            <h2 style={{ marginBottom: 8 }}>Default working windows</h2>
            <p>Your default working hours, used when analysing and placing jobs.</p>
          </div>

          <div className="space-y-3">
            {snapshot.workSchedule.map((slot) => (
              <div key={slot.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{dayNames[slot.dayOfWeek]}</span>
                  </div>
                  <h3>{dayNames[slot.dayOfWeek]}</h3>
                  <p>{slot.startTime} - {slot.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Personal commitments</div>
            <h2 style={{ marginBottom: 8 }}>Existing weekly blocks</h2>
            <p>Recurring blocks that compete with job slots each week.</p>
          </div>

          <div className="space-y-3">
            {snapshot.commitments.length > 0 ? snapshot.commitments.map((commitment) => (
              <div key={commitment.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill border-l-amber-500">{dayNames[commitment.dayOfWeek]}</span>
                  </div>
                  <h3>{commitment.title}</h3>
                  <p>{commitment.startTime} - {commitment.endTime}{commitment.address ? ` · ${commitment.address}` : ""}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No recurring personal commitments recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Upcoming jobs</div>
            <h2>Upcoming jobs</h2>
            <p>Adjust the scheduled time for any job directly from this view.</p>
          </div>
        </div>

        <div className="space-y-3">
          {snapshot.jobs.length > 0 ? snapshot.jobs.map((job) => (
            <div key={job.id} className="grid gap-4 rounded-lg border bg-card/40 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${job.weatherRisk ? "is-warning" : "is-off"}`}>
                    {job.weatherRisk ? "Weather risk" : "Clear"}
                  </span>
                  <span>
                    {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}
                  </span>
                  <span>{job.suburb ?? "Suburb not set"}</span>
                </div>
                <h3>
                  <Link className="inline-entity-link" href={getJobPrimaryHref(job)}>
                    {job.summary}
                  </Link>
                </h3>
                <p>
                  <CustomerLink customerId={job.customer.id} className="inline-entity-link">
                    {job.customer.firstName} {job.customer.lastName}
                  </CustomerLink>
                </p>
              </div>

              <form action={`/api/tenant/jobs/${job.id}/schedule`} method="post" className="space-y-2">
                <input type="hidden" name="returnTo" value="/dashboard/scheduler" />
                <label htmlFor={`scheduledFor-${job.id}`}>Reschedule</label>
                <input
                  id={`scheduledFor-${job.id}`}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  name="scheduledFor"
                  type="datetime-local"
                  defaultValue={job.scheduledFor ? new Date(job.scheduledFor).toISOString().slice(0, 16) : ""}
                  required
                />
                <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
                  Save new time
                </button>
              </form>
            </div>
          )) : <p className="text-sm text-muted-foreground">No upcoming jobs are scheduled yet.</p>}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Time off</div>
            <h2>Time off</h2>
            <p>Periods when you&apos;re unavailable — visible alongside your job schedule.</p>
          </div>
        </div>

        <div className="space-y-3">
          {snapshot.timeOff.length > 0 ? snapshot.timeOff.map((entry) => (
            <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill border-l-amber-500">Time off</span>
                </div>
                <h3>{entry.title}</h3>
                <p>{new Date(entry.startAt).toLocaleDateString()} - {new Date(entry.endAt).toLocaleDateString()}</p>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No future time off has been recorded.</p>}
        </div>
      </div>
    </div>
  );
}
