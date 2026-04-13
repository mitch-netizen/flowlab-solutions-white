import Link from "next/link";

import { getTenantEvents, getTenantIntegrations, getTenantAutomationHealth } from "@flowlab/db";
import { getServiceLabel, serviceLabels } from "@flowlab/contracts";

import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getCustomerRecordHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const session = await requireTenantSession();
  const [events, integrations, automationHealth] = await Promise.all([
    getTenantEvents(session.tenantId),
    getTenantIntegrations(session.tenantId),
    getTenantAutomationHealth(session.tenantId)
  ]);

  const hasAlerts =
    automationHealth.failed > 0 ||
    integrations.some((i) => i.status === "error") ||
    integrations.some((i) => {
      if (!i.oauthExpiresAt) return false;
      return new Date(i.oauthExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
    });

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Growth and ops"
        title="Keep a close eye on automation health and service status."
        description="Use this screen to spot failures early, reconnect expiring services, and understand whether jobs, events, and integrations are still flowing as expected."
        section="operations"
      />

      {hasAlerts ? (
        <div className="surface" style={{ borderLeft: "3px solid #dc2626" }}>
          <h2 style={{ marginTop: 0, color: "#fca5a5" }}>Action needed</h2>
          {automationHealth.failed > 0 ? (
            <p style={{ color: "#fca5a5", marginBottom: 0 }}>
              {automationHealth.failed} automation job{automationHealth.failed === 1 ? "" : "s"} failed. See below to retry.
            </p>
          ) : null}
          {integrations
            .filter((i) => i.status === "error")
            .map((i) => (
              <p key={i.id} style={{ color: "#fca5a5", marginBottom: 0 }}>
                {serviceLabels[i.service]} has an error — check your credentials in Integrations.
              </p>
            ))}
          {integrations
            .filter((i) => {
              if (!i.oauthExpiresAt) return false;
              return new Date(i.oauthExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
            })
            .map((i) => {
              const daysLeft = Math.floor((new Date(i.oauthExpiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <p key={i.id} style={{ color: "#fbbf24", marginBottom: 0 }}>
                  ⚠ {serviceLabels[i.service]} connection expires {daysLeft <= 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`} — reconnect from Integrations.
                </p>
              );
            })}
        </div>
      ) : null}

      <div className="surface">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Automation jobs</h2>
          <div style={{ display: "flex", gap: 16, color: "#94a3b8", fontSize: 14 }}>
            <span>Pending: <strong style={{ color: "white" }}>{automationHealth.pending}</strong></span>
            <span>Processing: <strong style={{ color: "white" }}>{automationHealth.processing}</strong></span>
            <span>Failed: <strong style={{ color: automationHealth.failed > 0 ? "#fca5a5" : "white" }}>{automationHealth.failed}</strong></span>
          </div>
        </div>

        {automationHealth.recentFailedJobs.length > 0 ? (
          <div className="stack" style={{ gap: 8 }}>
            {automationHealth.recentFailedJobs.map((job) => (
              <div key={job.id} className="surface-soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{job.kind.replace(/_/g, " ")}</div>
                  <div style={{ color: "#fca5a5", fontSize: 14, marginBottom: 4 }}>
                    {job.lastError ?? "Unknown error"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {job.attempts} attempt{job.attempts === 1 ? "" : "s"} — last tried {new Date(job.updatedAt).toLocaleString()}
                  </div>
                </div>
                <form action="/api/tenant/automation/retry" method="post">
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="ghost" type="submit" style={{ fontSize: 13, padding: "6px 14px" }}>
                    Retry
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#94a3b8", margin: 0 }}>No failed jobs — everything is running normally.</p>
        )}
      </div>

      <div className="cards-3">
        {integrations.map((integration) => {
          const expiresAt = integration.oauthExpiresAt ? new Date(integration.oauthExpiresAt) : null;
          const daysUntilExpiry = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

          return (
            <Link key={integration.id} href="/dashboard/integrations" className="surface-soft surface-link">
              <strong>{serviceLabels[integration.service]}</strong>
              <div style={{
                marginTop: 10,
                color: integration.status === "connected" ? "#16a34a" : integration.status === "error" ? "#dc2626" : "#94a3b8",
                fontWeight: 600
              }}>
                {integration.status}
              </div>
              {daysUntilExpiry !== null && daysUntilExpiry < 7 ? (
                <div style={{ marginTop: 6, color: "#fbbf24", fontSize: 13 }}>
                  Expires {daysUntilExpiry <= 0 ? "today" : `in ${daysUntilExpiry}d`}
                </div>
              ) : null}
              {integration.lastTestedAt ? (
                <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                  {new Date(integration.lastTestedAt).toLocaleDateString()}
                </div>
              ) : null}
              {integration.lastErrorMessage ? (
                <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 12 }}>
                  {integration.lastErrorMessage}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="surface">
        <h2>Live event log</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Service</th>
              <th>Status</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{getServiceLabel(event.service)}</td>
                <td style={{ color: event.status === "failed" ? "#fca5a5" : event.status === "success" ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                  {event.status}
                </td>
                <td style={{ color: "#cbd5e1" }}>
                  <Link
                    className="inline-entity-link"
                    href={event.jobId ? getJobRecordHref(event.jobId) : event.customerId ? getCustomerRecordHref(event.customerId) : "/dashboard/system-health"}
                  >
                    {event.requestSummary ?? event.responseSummary ?? event.errorMessage ?? "—"}
                  </Link>
                  {event.errorMessage && event.requestSummary ? (
                    <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 2 }}>{event.errorMessage}</div>
                  ) : null}
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "#64748b", textAlign: "center" }}>No events recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
