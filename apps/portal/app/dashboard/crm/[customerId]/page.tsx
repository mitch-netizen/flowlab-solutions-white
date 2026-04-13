import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerCrmRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function CustomerRecordPage({ params }: { params: Promise<{ customerId: string }> }) {
  const session = await requireTenantSession();
  const { customerId } = await params;
  const record = await getCustomerCrmRecord(session.tenantId, customerId);

  if (!record) {
    notFound();
  }

  const { customer, communications, feedback, reminders } = record;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Workspace"
        title={`${customer.firstName} ${customer.lastName}`}
        description="This CRM record brings the full customer relationship together: work history, quotes, invoices, reminders, and recent communication."
        section="crm"
        actions={(
          <Link className="ghost" href="/dashboard/crm">
            Back to CRM
          </Link>
        )}
      />

      <div className="cards-3">
        <div className="surface-soft">
          <strong>Jobs</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{customer.jobs.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Quotes</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{customer.quotes.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Invoices</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{customer.invoices.length}</div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Contact details</h2>
          <div className="stack" style={{ gap: 12 }}>
            <div><strong>Email</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.email}</div></div>
            <div><strong>Phone</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.phone ?? "Not set"}</div></div>
            <div><strong>Address</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.address ?? "Not set"}</div></div>
            <div><strong>Suburb</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.suburb ?? "Not set"}</div></div>
            <div><strong>Rating</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.ratingAverage?.toFixed(1) ?? "No ratings yet"}</div></div>
          </div>
        </div>

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Recent communication</h2>
          <div className="stack">
            {communications.length > 0 ? communications.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.channel.toUpperCase()} · {entry.status}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.subject ?? entry.body}</div>
              </div>
            )) : <div className="surface-soft">No communication recorded for this customer yet.</div>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Jobs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {customer.jobs.map((job) => (
                <tr key={job.id}>
                  <td><Link className="inline-entity-link" href={getJobRecordHref(job.id)}>{job.summary}</Link></td>
                  <td>{job.status}</td>
                  <td>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Invoices</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></td>
                  <td>{invoice.status}</td>
                  <td>${invoice.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Quotes and agreements</h2>
          <div className="stack">
            {customer.quotes.map((quote) => (
              <div key={quote.id} className="surface-soft">
                <strong>{quote.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{quote.status} · ${quote.amount}</div>
              </div>
            ))}
            {customer.agreements.map((agreement) => (
              <div key={agreement.id} className="surface-soft">
                <strong>{agreement.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{agreement.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Feedback and reminders</h2>
          <div className="stack">
            {feedback.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.rating} stars</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.comment ?? "No comment supplied."}</div>
              </div>
            ))}
            {reminders.map((reminder) => (
              <div key={reminder.id} className="surface-soft">
                <strong>Rebook reminder</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  {reminder.status} · due {new Date(reminder.dueAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {feedback.length === 0 && reminders.length === 0 ? (
              <div className="surface-soft">
                No feedback or rebook reminders recorded for <CustomerLink customerId={customer.id} className="inline-entity-link">{customer.firstName}</CustomerLink> yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
