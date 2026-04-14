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
        title="Run the week from a clearer scheduling surface."
        description="Use the scheduler to understand what needs moving, where life commitments are already blocking time, and which jobs still need a safer slot."
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
            <p className="setup-summary-copy">Scheduled work currently sitting in the planner.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Blocked time</div>
            <div className="setup-summary-value">{totalBlocks}</div>
            <p className="setup-summary-copy">Personal commitments and time off already competing with jobs.</p>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Recommendations</div>
            <h2>Lead with the jobs that need a decision</h2>
            <p>Suggestions are only useful if they read like next actions, not generic advice. Keep the customer and the reason close to the job link.</p>
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
            <p>These are the operator hours FlowLab should assume before it starts trying to place or analyze work.</p>
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
            <p>These commitments should be visible without needing to mentally merge them with the job list.</p>
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
            <h2>Rescheduling should happen inline, without fighting a giant table</h2>
            <p>Each row keeps the job context on the left and the new time entry on the right so the operator can adjust quickly.</p>
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
            <h2>Longer absences should stay visible at the same level as jobs</h2>
            <p>Time off is part of the scheduling picture, so it should be easy to scan without diving into settings.</p>
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
