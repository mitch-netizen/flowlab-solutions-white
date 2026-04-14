import Link from "next/link";

import { getServiceLabel, serviceLabels } from "@flowlab/contracts";
import { getTenantAutomationHealth, getTenantEvents, getTenantIntegrations } from "@flowlab/db";

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
  const tenantIntegrations = integrations.filter((integration) => integration.service !== "stripe");
  const actionableIntegrations = tenantIntegrations.filter(
    (integration) => !(integration.service === "make_com" && integration.status === "not_configured")
  );

  const expiringIntegrations = actionableIntegrations.filter((integration) => {
    if (!integration.oauthExpiresAt) {
      return false;
    }

    return new Date(integration.oauthExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  });

  const errorIntegrations = actionableIntegrations.filter((integration) => integration.status === "error");

  const hasAlerts =
    automationHealth.failed > 0 ||
    errorIntegrations.length > 0 ||
    expiringIntegrations.length > 0;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Watch the system without wading through noise."
        description="This page should answer three questions quickly: are automations failing, are integrations expiring, and are live events still flowing through the platform."
        section="setup"
        actions={(
          <Link className="ghost" href="/dashboard/integrations">
            Open integrations
          </Link>
        )}
      />

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Pending jobs</div>
            <div className="setup-summary-value">{automationHealth.pending}</div>
            <p className="setup-summary-copy">Queued automation work waiting to be picked up.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Processing now</div>
            <div className="setup-summary-value">{automationHealth.processing}</div>
            <p className="setup-summary-copy">Automation jobs currently in flight.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Alerts</div>
            <div className="setup-summary-value">{automationHealth.failed + errorIntegrations.length + expiringIntegrations.length}</div>
            <p className="setup-summary-copy">Failed jobs, broken integrations, and expiring connections combined.</p>
          </div>
        </div>
      </div>

      {hasAlerts ? (
        <div className="surface surface-alert is-danger">
          <h2>Action needed</h2>
          {automationHealth.failed > 0 ? (
            <p>{automationHealth.failed} automation job{automationHealth.failed === 1 ? "" : "s"} failed and should be retried.</p>
          ) : null}
          {errorIntegrations.map((integration) => (
            <p key={integration.id}>{serviceLabels[integration.service]} has an error and may need credentials or reconnecting.</p>
          ))}
          {expiringIntegrations.map((integration) => {
            const daysLeft = Math.floor((new Date(integration.oauthExpiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <p key={integration.id}>
                {serviceLabels[integration.service]} connection expires {daysLeft <= 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}.
              </p>
            );
          })}
        </div>
      ) : null}

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Automation jobs</div>
            <h2>Failed work should surface as a short action list</h2>
            <p>If something breaks, the operator should see the error, the last attempt, and the retry button in the same row.</p>
          </div>
        </div>

        <div className="setup-list">
          {automationHealth.recentFailedJobs.length > 0 ? automationHealth.recentFailedJobs.map((job) => (
            <div key={job.id} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-warning">{job.kind.replace(/_/g, " ")}</span>
                  <span>{job.attempts} attempt{job.attempts === 1 ? "" : "s"}</span>
                  <span>Last tried {new Date(job.updatedAt).toLocaleString()}</span>
                </div>
                <h3>{job.kind.replace(/_/g, " ")}</h3>
                <p>{job.lastError ?? "Unknown error"}</p>
              </div>
              <div className="setup-row-actions">
                <form action="/api/tenant/automation/retry" method="post">
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="ghost" type="submit">
                    Retry
                  </button>
                </form>
              </div>
            </div>
          )) : <p className="setup-note">No failed jobs. Automations are currently healthy.</p>}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Connections</div>
            <h2>Integration health should read like a simple status list</h2>
            <p>Optional Make setup stays visible, but it should not shout louder than broken or expiring core services.</p>
          </div>
        </div>

        <div className="setup-list">
          {tenantIntegrations.map((integration) => {
            const isOptionalMake = integration.service === "make_com" && integration.status === "not_configured";
            const expiresAt = integration.oauthExpiresAt ? new Date(integration.oauthExpiresAt) : null;
            const daysUntilExpiry = expiresAt
              ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            const statusClass = integration.status === "connected"
              ? "is-on"
              : integration.status === "error"
                ? "is-warning"
                : "is-off";

            return (
              <div key={integration.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${isOptionalMake ? "is-off" : statusClass}`}>
                      {isOptionalMake ? "Optional" : integration.status}
                    </span>
                    {integration.lastTestedAt ? (
                      <span>Tested {new Date(integration.lastTestedAt).toLocaleDateString()}</span>
                    ) : null}
                    {daysUntilExpiry !== null && daysUntilExpiry < 7 ? (
                      <span>Expires {daysUntilExpiry <= 0 ? "today" : `in ${daysUntilExpiry}d`}</span>
                    ) : null}
                  </div>
                  <h3>{serviceLabels[integration.service]}</h3>
                  <p>
                    {isOptionalMake
                      ? "Advanced external automation only."
                      : integration.lastErrorMessage ?? "Connection looks healthy."}
                  </p>
                </div>
                <div className="setup-row-actions">
                  <Link className="ghost" href="/dashboard/integrations">Manage</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Live event log</div>
            <h2>Recent platform events stay dense, but easier to scan</h2>
            <p>Keep time, service, status, and the useful summary visible without turning the whole screen into a spreadsheet wall.</p>
          </div>
        </div>

        <div className="setup-table-wrap">
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
                  <td style={{ fontWeight: 700 }}>
                    <span
                      style={{
                        color: event.status === "failed" ? "#fca5a5" : event.status === "success" ? "#86efac" : "#94a3b8"
                      }}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td style={{ color: "#cbd5e1" }}>
                    <Link
                      className="inline-entity-link"
                      href={event.jobId ? getJobRecordHref(event.jobId) : event.customerId ? getCustomerRecordHref(event.customerId) : "/dashboard/system-health"}
                    >
                      {event.requestSummary ?? event.responseSummary ?? event.errorMessage ?? "—"}
                    </Link>
                    {event.errorMessage && event.requestSummary ? (
                      <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>{event.errorMessage}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "#64748b", textAlign: "center" }}>
                    No events recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
