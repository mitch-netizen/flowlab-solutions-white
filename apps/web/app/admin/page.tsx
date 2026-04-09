import Link from "next/link";

import { getPlatformOverview } from "@flowlab/db";

export const dynamic = "force-dynamic";
import { getServiceLabel } from "@flowlab/contracts";
import { requirePlatformSession } from "../../lib/session";

export default async function AdminPage() {
  await requirePlatformSession();
  const overview = await getPlatformOverview();
  const platformXero = overview.platformIntegrations.find((integration: { service: string }) => integration.service === "xero");

  return (
    <main className="shell">
      <section className="grid">
        <div className="hero-card">
          <div className="pill">Platform overview</div>
          <h1>FlowLab superadmin dashboard</h1>
          <p className="muted">Track tenant health, monitor platform-wide events, and spin up new branded operator workspaces.</p>
        </div>
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
        </div>
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Platform integrations</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Services connected to FlowLab itself, not to an individual tenant.
              </p>
            </div>
            <a href="/api/admin/integrations/xero" className="cta">
              {platformXero?.status === "connected" ? "Reconnect Xero" : "Connect Xero"}
            </a>
          </div>
          <div className="panel-soft" style={{ marginBottom: 20 }}>
            <strong>Xero</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Status: <span style={{ color: platformXero?.status === "connected" ? "#16a34a" : "#94a3b8" }}>{platformXero?.status ?? "not_configured"}</span>
            </div>
            {platformXero?.lastTestedAt ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Last updated: {new Date(platformXero.lastTestedAt).toLocaleString()}
              </div>
            ) : null}
            {platformXero?.lastErrorMessage ? (
              <div className="muted" style={{ marginTop: 6, color: "#fca5a5" }}>
                {platformXero.lastErrorMessage}
              </div>
            ) : null}
            {platformXero?.credentialsJson ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Platform Xero credentials are stored and ready for FlowLab-wide accounting features.
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
            <Link href="/signup" className="cta">
              Create tenant
            </Link>
          </div>
          <table className="table">
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
                    <Link href={`http://${tenant.slug}.localhost:3001/dashboard`} target="_blank">Portal</Link>
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
                <div>{event.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
