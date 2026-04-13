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

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Workspace"
        title="Balance jobs, personal commitments, and schedule risk."
        description="Set your work windows, block out life commitments, and let FlowLab flag clashes, weak plans, and weather risk before the day gets messy."
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
        <h2 style={{ marginTop: 0 }}>Recommendations</h2>
          <div className="stack">
            {recommendations.map((item) => (
              <div key={item.jobId} className="surface-soft">
                <strong><Link className="inline-entity-link" href={getJobRecordHref(item.jobId)}>{item.summary}</Link></strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  <CustomerLink customerId={item.customerId} className="inline-entity-link">{item.customerName}</CustomerLink>
                </div>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{item.suggestedAction}</div>
                {item.reasons.length > 0 ? <div style={{ color: "#fcd34d", marginTop: 8 }}>{item.reasons.join(" · ")}</div> : null}
              </div>
            ))}
          </div>
        </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Work week</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.workSchedule.map((slot) => (
                <tr key={slot.id}>
                  <td>{dayNames[slot.dayOfWeek]}</td>
                  <td>
                    {slot.startTime} - {slot.endTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Personal commitments</h2>
          <div className="stack">
            {snapshot.commitments.map((commitment) => (
              <div key={commitment.id} className="surface-soft">
                <strong>{commitment.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  {dayNames[commitment.dayOfWeek]} · {commitment.startTime} - {commitment.endTime}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{commitment.address}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Upcoming jobs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Customer</th>
                <th>Suburb</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link className="inline-entity-link" href={getJobPrimaryHref(job)}>
                      {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}
                    </Link>
                  </td>
                  <td>
                    <CustomerLink customerId={job.customer.id} className="inline-entity-link">
                      {job.customer.firstName} {job.customer.lastName}
                    </CustomerLink>
                  </td>
                  <td>{job.suburb}</td>
                  <td>{job.weatherRisk ? "Weather risk" : "Clear"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Time off</h2>
          <div className="stack">
            {snapshot.timeOff.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  {new Date(entry.startAt).toLocaleDateString()} - {new Date(entry.endAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
