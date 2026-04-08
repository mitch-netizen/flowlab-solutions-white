import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage() {
  const session = await requireTenantSession();
  const snapshot = await getCrmSnapshot(session.tenantId);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">CRM</div>
        <h1>Customers, communications, feedback, and overdue risk in one view.</h1>
        <p style={{ color: "#cbd5e1" }}>Keep tabs on every customer — who&apos;s overdue, who&apos;s loyal, and who might need a nudge to rebook.</p>
      </div>
      <div className="cards-3">
        <div className="surface-soft">
          <strong>Customers</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.customers.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Recent communications</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.communications.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Overdue invoices</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.overdueInvoices.length}</div>
        </div>
      </div>
      <div className="surface">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Suburb</th>
              <th>Jobs</th>
              <th>Quotes</th>
              <th>Invoices</th>
              <th>Health</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.customers.map((customer) => {
              const overdueCount = customer.invoices.filter((invoice) => invoice.dueAt && invoice.dueAt < new Date() && invoice.status !== "paid").length;
              const health = overdueCount > 0 ? "Needs attention" : customer.jobs.length > 2 ? "Active" : "Light touch";

              return (
                <tr key={customer.id}>
                  <td>
                    <strong>
                      {customer.firstName} {customer.lastName}
                    </strong>
                    <div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.email}</div>
                  </td>
                  <td>{customer.suburb ?? "n/a"}</td>
                  <td>{customer.jobs.length}</td>
                  <td>{customer.quotes.length}</td>
                  <td>{customer.invoices.length}</td>
                  <td>{health}</td>
                  <td>
                    <Link href="/dashboard/quotes">Quote</Link>
                    {" · "}
                    <Link href="/dashboard/invoices">Invoice</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Recent feedback</h2>
          <div className="stack">
            {snapshot.feedback.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.rating} stars</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.comment ?? "No comment supplied."}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Recent communications</h2>
          <div className="stack">
            {snapshot.communications.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.channel.toUpperCase()}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.subject ?? entry.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
