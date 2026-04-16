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
            <button className="cta" type="submit">
              Queue schedule analysis
            </button>
          </form>
        )}
      />

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Recommendations</div>
            <div className="setup-summary-value">{recommendations.length}</div>
            <p className="setup-summary-copy">Jobs the analysis thinks deserve attention first.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Upcoming jobs</div>
            <div className="setup-summary-value">{snapshot.jobs.length}</div>
            <p className="setup-summary-copy">Jobs with a confirmed date and time.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Blocked time</div>
            <div className="setup-summary-value">{totalBlocks}</div>
            <p className="setup-summary-copy">Personal commitments and time off logged against your schedule.</p>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Recommendations</div>
            <h2>Scheduling recommendations</h2>
            <p>Jobs flagged by the analysis as needing attention — check the reason, then open the job to take action.</p>
          </div>
        </div>

        <div className="setup-list">
          {recommendations.length > 0 ? recommendations.map((item) => (
            <div key={item.jobId} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
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
                  <div className="setup-row-meta">
                    {item.reasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="setup-row-actions">
                <Link className="ghost" href={getJobRecordHref(item.jobId)}>Open job</Link>
              </div>
            </div>
          )) : <p className="setup-note">No scheduling recommendations right now. The current plan looks stable.</p>}
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Work week</div>
            <h2 style={{ marginBottom: 8 }}>Default working windows</h2>
            <p>Your default working hours, used when analysing and placing jobs.</p>
          </div>

          <div className="setup-list">
            {snapshot.workSchedule.map((slot) => (
              <div key={slot.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{dayNames[slot.dayOfWeek]}</span>
                  </div>
                  <h3>{dayNames[slot.dayOfWeek]}</h3>
                  <p>{slot.startTime} - {slot.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Personal commitments</div>
            <h2 style={{ marginBottom: 8 }}>Existing weekly blocks</h2>
            <p>Recurring blocks that compete with job slots each week.</p>
          </div>

          <div className="setup-list">
            {snapshot.commitments.length > 0 ? snapshot.commitments.map((commitment) => (
              <div key={commitment.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-warning">{dayNames[commitment.dayOfWeek]}</span>
                  </div>
                  <h3>{commitment.title}</h3>
                  <p>{commitment.startTime} - {commitment.endTime}{commitment.address ? ` · ${commitment.address}` : ""}</p>
                </div>
              </div>
            )) : <p className="setup-note">No recurring personal commitments recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Upcoming jobs</div>
            <h2>Upcoming jobs</h2>
            <p>Adjust the scheduled time for any job directly from this view.</p>
          </div>
        </div>

        <div className="setup-scenario-grid">
          {snapshot.jobs.length > 0 ? snapshot.jobs.map((job) => (
            <div key={job.id} className="setup-scenario-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
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

              <form action={`/api/tenant/jobs/${job.id}/schedule`} method="post" className="setup-scenario-input">
                <input type="hidden" name="returnTo" value="/dashboard/scheduler" />
                <label htmlFor={`scheduledFor-${job.id}`}>Reschedule</label>
                <input
                  id={`scheduledFor-${job.id}`}
                  className="input"
                  name="scheduledFor"
                  type="datetime-local"
                  defaultValue={job.scheduledFor ? new Date(job.scheduledFor).toISOString().slice(0, 16) : ""}
                  required
                />
                <button className="ghost" type="submit">
                  Save new time
                </button>
              </form>
            </div>
          )) : <p className="setup-note">No upcoming jobs are scheduled yet.</p>}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Time off</div>
            <h2>Time off</h2>
            <p>Periods when you&apos;re unavailable — visible alongside your job schedule.</p>
          </div>
        </div>

        <div className="setup-list">
          {snapshot.timeOff.length > 0 ? snapshot.timeOff.map((entry) => (
            <div key={entry.id} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-warning">Time off</span>
                </div>
                <h3>{entry.title}</h3>
                <p>{new Date(entry.startAt).toLocaleDateString()} - {new Date(entry.endAt).toLocaleDateString()}</p>
              </div>
            </div>
          )) : <p className="setup-note">No future time off has been recorded.</p>}
        </div>
      </div>
    </div>
  );
}
