import { getTenantDashboardSnapshot } from "@flowlab/db";

import { requireTenantSession } from "../../lib/session";

export default async function DashboardPage() {
  const session = await requireTenantSession();
  const snapshot = await getTenantDashboardSnapshot(session.tenantId);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Operator dashboard</div>
        <h1 style={{ marginBottom: 10 }}>Welcome back, {snapshot.tenant?.profile?.businessName ?? "operator"}.</h1>
        <p style={{ color: "#cbd5e1" }}>This shell already exposes the core product lanes: onboarding, integrations, health, public enquiry intake, and white-label public token routes.</p>
      </div>
      <div className="cards-3">
        <div className="surface-soft">
          <strong>Customers</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{snapshot.customers.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Recent jobs</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{snapshot.jobs.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Integrations</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{snapshot.integrations.length}</div>
        </div>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2>Recent jobs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Summary</th>
                <th>Suburb</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.status}</td>
                  <td>{job.summary}</td>
                  <td>{job.suburb ?? "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface">
          <h2>Recent invoices</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.number}</td>
                  <td>{invoice.status}</td>
                  <td>${invoice.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
