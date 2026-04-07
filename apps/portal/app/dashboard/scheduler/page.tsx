import { getSchedulerRecommendations, getTenantSchedulerSnapshot } from "@flowlab/db";

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
      <div className="surface">
        <div className="eyebrow">Scheduler</div>
        <h1>Work windows, life commitments, weather flags, and upcoming jobs.</h1>
        <p style={{ color: "#cbd5e1" }}>This module gives the routing engine the right substrate: work schedule, time off, personal commitments, and scheduled jobs.</p>
        <form action="/api/tenant/scheduler/analyze" method="post" style={{ marginTop: 18 }}>
          <button className="cta" type="submit">
            Queue schedule analysis
          </button>
        </form>
      </div>
      <div className="surface">
        <h2 style={{ marginTop: 0 }}>Recommendations</h2>
        <div className="stack">
          {recommendations.map((item) => (
            <div key={item.jobId} className="surface-soft">
              <strong>{item.summary}</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{item.customerName}</div>
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
                  <td>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</td>
                  <td>
                    {job.customer.firstName} {job.customer.lastName}
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
