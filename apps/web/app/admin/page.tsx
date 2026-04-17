import Link from "next/link";

import { getPlatformOverview, getAdminHealthSummary } from "@flowlab/db";
import { buildTenantUrl } from "@flowlab/contracts/server";

export const dynamic = "force-dynamic";
import { getServiceLabel } from "@flowlab/contracts";
import AdminPageScaffold from "../../components/admin/page-scaffold";
import { requirePlatformSession } from "../../lib/session";

export default async function AdminPage() {
  await requirePlatformSession();
  const [overview, healthSummary] = await Promise.all([
    getPlatformOverview(),
    getAdminHealthSummary()
  ]);
  const platformXero = overview.platformIntegrations.find((integration: { service: string }) => integration.service === "xero");
  const xeroExpiresAt = (platformXero as { oauthExpiresAt?: string | null } | undefined)?.oauthExpiresAt;
  const xeroDaysLeft = xeroExpiresAt ? Math.floor((new Date(xeroExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <AdminPageScaffold
      title="FlowLab superadmin dashboard"
      description="Track tenant health, monitor platform-wide events, and spin up new branded operator workspaces."
      meta={<span className="pill">Platform overview</span>}
      actions={(
        <Link href="/signup" className="cta">
          Create tenant
        </Link>
      )}
    >
        <div className="metrics">
          <div className="metric">
            <span className="muted">Active tenants</span>
            <strong>{overview.stats.totalActiveTenants}</strong>
          </div>
          <div className="metric">
            <span className="muted">Jobs this month</span>
            <strong>{overview.stats.jobs}</strong>
          </div>
          <div className="metric">
            <span className="muted">Platform revenue</span>
            <strong>${overview.stats.totalRevenue}</strong>
          </div>
          {healthSummary.totalFailedJobs > 0 ? (
            <div className="metric" style={{ borderColor: "#dc2626" }}>
              <span className="muted">Failed jobs</span>
              <strong style={{ color: "#dc2626" }}>{healthSummary.totalFailedJobs}</strong>
            </div>
          ) : null}
        </div>

        {healthSummary.totalFailedJobs > 0 || (xeroDaysLeft !== null && xeroDaysLeft < 7) ? (
          <div className="panel" style={{ borderLeft: "3px solid #dc2626" }}>
            <h2 style={{ marginTop: 0 }}>Platform alerts</h2>
            {xeroDaysLeft !== null && xeroDaysLeft < 7 ? (
              <div className="panel-soft" style={{ marginBottom: 12, color: "#fbbf24" }}>
                ⚠ FlowLab's Xero token expires {xeroDaysLeft <= 0 ? "today" : `in ${xeroDaysLeft} day${xeroDaysLeft === 1 ? "" : "s"}`} — reconnect to avoid accounting disruption.
              </div>
            ) : null}
            {healthSummary.totalFailedJobs > 0 ? (
              <div className="panel-soft" style={{ color: "#fca5a5" }}>
                {healthSummary.totalFailedJobs} automation job{healthSummary.totalFailedJobs === 1 ? "" : "s"} across {healthSummary.tenantsWithFailures} tenant{healthSummary.tenantsWithFailures === 1 ? "" : "s"} failed and need attention. View each tenant's system health to retry.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Platform integrations</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Services connected to FlowLab itself — separate from each tenant's own business integrations.
              </p>
            </div>
            <a href="/api/admin/integrations/xero" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {platformXero?.status === "connected" ? "Reconnect FlowLab's Xero" : "Connect FlowLab's Xero"}
            </a>
          </div>
          <div className="panel-soft" style={{ marginBottom: 20 }}>
            <strong>FlowLab Xero (platform accounting)</strong>
            <p className="muted" style={{ marginTop: 6, marginBottom: 12 }}>
              This is FlowLab's own Xero account for platform-level accounting and finance workflows. Tenants connect their own Xero separately from their integrations page.
            </p>
            <div className="muted">
              Status:{" "}
              <span style={{ color: platformXero?.status === "connected" ? "#16a34a" : platformXero?.status === "error" ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>
                {platformXero?.status ?? "not_configured"}
              </span>
            </div>
            {xeroDaysLeft !== null && xeroDaysLeft < 7 ? (
              <div style={{ marginTop: 8, color: "#fbbf24", fontWeight: 600 }}>
                ⚠ Token expires {xeroDaysLeft <= 0 ? "today" : `in ${xeroDaysLeft} day${xeroDaysLeft === 1 ? "" : "s"}`}
              </div>
            ) : null}
            {platformXero?.lastTestedAt ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Last connected: {new Date(platformXero.lastTestedAt as unknown as string).toLocaleString()}
              </div>
            ) : null}
            {(platformXero as unknown as { lastErrorMessage?: string | null } | undefined)?.lastErrorMessage ? (
              <div style={{ marginTop: 8, color: "#fca5a5" }}>
                {(platformXero as unknown as { lastErrorMessage: string }).lastErrorMessage}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Tenant management</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                All tenants, plans, recent activity, and integration health.
              </p>
            </div>
          </div>
          <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
            <thead>
              <tr>
                <th>Business</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Customers</th>
                <th>Jobs</th>
                <th>Invoices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.tenants.map((tenant: (typeof overview.tenants)[number]) => (
                <tr key={tenant.id}>
                  <td>
                    <Link href={`/admin/tenant/${tenant.id}`} style={{ fontWeight: 600 }}>
                      {tenant.profile?.businessName ?? tenant.slug}
                    </Link>
                  </td>
                  <td>{tenant.plan}</td>
                  <td style={{
                    color: tenant.status === "active" ? "#16a34a" : tenant.status === "trial" ? "#d97706" : "#dc2626",
                    fontWeight: 600
                  }}>
                    {tenant.status}
                  </td>
                  <td>{tenant._count.customers}</td>
                  <td>{tenant._count.jobs}</td>
                  <td>{tenant._count.invoices}</td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/admin/tenant/${tenant.id}`}>View</Link>
                    <Link href={process.env.NODE_ENV === "production" ? buildTenantUrl(tenant.slug, "/dashboard") : `http://${tenant.slug}.localhost:3001/dashboard`} target="_blank">Portal</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2>Platform-wide event log</h2>
          <div className="grid">
            {overview.events.map((event: (typeof overview.events)[number]) => (
              <div key={event.id} className="panel-soft">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <strong>{getServiceLabel(event.service)}</strong>
                  <span className="muted">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <p className="muted">{event.requestSummary}</p>
                <div style={{ color: event.status === "failed" ? "#fca5a5" : event.status === "success" ? "#16a34a" : "#94a3b8" }}>
                  {event.status}
                </div>
              </div>
            ))}
          </div>
        </div>
    </AdminPageScaffold>
  );
}
