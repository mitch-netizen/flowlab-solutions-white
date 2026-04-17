import Link from "next/link";

import { getRetentionSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getInvoiceRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

export default async function RetentionPage() {
  const session = await requireTenantSession();
  const snapshot = await getRetentionSnapshot(session.tenantId);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="CRM"
        title="Retention"
        description="Track rebook reminders, overdue invoices, and recent customer feedback in one place."
        section="crm"
        actions={(
          <form action="/api/tenant/retention/run" method="post">
            <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
              Queue retention automations
            </button>
          </form>
        )}
      />
      <div className="cards-3">
        <div className="rounded-lg border bg-card/60 p-4">
          <strong>Low ratings</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.stats.lowRatings}</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-4">
          <strong>5-star reviews</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.stats.fiveStars}</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-4">
          <strong>Overdue invoices</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.stats.overdueInvoices}</div>
        </div>
      </div>
      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Rebook reminders</h2>
          <div className="stack">
            {snapshot.reminders.map((entry) => (
              <CustomerLink key={entry.id} customerId={entry.customerId} className="rounded-lg border bg-card/60 p-4 transition hover:-translate-y-0.5 hover:border-border/80">
                <strong>{entry.status}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>Due {new Date(entry.dueAt).toLocaleDateString()}</div>
              </CustomerLink>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Recent feedback</h2>
          <div className="stack">
            {snapshot.feedback.map((entry) => (
              <CustomerLink key={entry.id} customerId={entry.customerId} className="rounded-lg border bg-card/60 p-4 transition hover:-translate-y-0.5 hover:border-border/80">
                <strong>{entry.rating} stars</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.comment ?? "No comment supplied."}</div>
              </CustomerLink>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h2>Overdue invoices</h2>
        <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></td>
                <td>
                  <CustomerLink customerId={invoice.customer.id} className="inline-entity-link">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </CustomerLink>
                </td>
                <td>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "n/a"}</td>
                <td>{invoice.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
