import Link from "next/link";

import { getServiceLabel, serviceLabels } from "@flowlab/contracts";
import { getTenantAutomationHealth, getTenantEvents, getTenantIntegrations } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../components/submit-button";
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
    
      <DashboardPageScaffold
        eyebrow="Setup"
        title="System health"
        description="Check automation queue status, integration connections, and the live event log — all in one place."
        section="setup"
        actions={(
          <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/integrations">
            Open integrations
          </Link>
        )}
      >

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending jobs</div>
            <div className="text-3xl font-semibold">{automationHealth.pending}</div>
            <p className="text-sm text-muted-foreground">Queued automation work waiting to be picked up.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Processing now</div>
            <div className="text-3xl font-semibold">{automationHealth.processing}</div>
            <p className="text-sm text-muted-foreground">Automation jobs currently in flight.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Alerts</div>
            <div className="text-3xl font-semibold">{automationHealth.failed + errorIntegrations.length + expiringIntegrations.length}</div>
            <p className="text-sm text-muted-foreground">Failed jobs, broken integrations, and expiring connections combined.</p>
          </div>
        </div>
      </div>

      {hasAlerts ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-red-500">
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

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Automation jobs</div>
            <h2>Failed automation jobs</h2>
            <p>Retry failed jobs from here. Each row shows the error and how many times it has been attempted.</p>
          </div>
        </div>

        <div className="space-y-3">
          {automationHealth.recentFailedJobs.length > 0 ? automationHealth.recentFailedJobs.map((job) => (
            <div key={job.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill border-l-amber-500">{job.kind.replace(/_/g, " ")}</span>
                  <span>{job.attempts} attempt{job.attempts === 1 ? "" : "s"}</span>
                  <span>Last tried {new Date(job.updatedAt).toLocaleString()}</span>
                </div>
                <h3>{job.kind.replace(/_/g, " ")}</h3>
                <p>{job.lastError ?? "Unknown error"}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <form action="/api/tenant/automation/retry" method="post">
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Retrying…">
                    Retry
                  </SubmitButton>
                </form>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No failed jobs. Automations are currently healthy.</p>}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Connections</div>
            <h2>Integration status</h2>
            <p>Connection status for all integrations. Go to Integrations to reconnect or update credentials.</p>
          </div>
        </div>

        <div className="space-y-3">
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
              <div key={integration.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/integrations">Manage</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Live event log</div>
            <h2>Event log</h2>
            <p>A live feed of automation and integration activity across your account.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
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
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
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
    </DashboardPageScaffold>
  );
}
