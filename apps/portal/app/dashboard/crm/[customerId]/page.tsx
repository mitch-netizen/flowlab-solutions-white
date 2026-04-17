import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerCrmRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function CustomerRecordPage({
  params,
  searchParams
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ updated?: string; message?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const { customerId } = await params;
  const query = await searchParams;
  const record = await getCustomerCrmRecord(session.tenantId, customerId);

  if (!record) {
    notFound();
  }

  const { customer, communications, feedback, reminders, enquiries } = record;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="CRM"
        title={`${customer.firstName} ${customer.lastName}`}
        description="Contact details, work history, billing, and messages all in one place."
        section="crm"
        actions={(
          <Link className="ghost" href="/dashboard/crm">
            Back to CRM
          </Link>
        )}
      />

      {query.updated === "1" ? (
        <div className="surface surface-alert is-success">
          <p>Customer details updated.</p>
        </div>
      ) : null}
      {query.message === "sent" ? (
        <div className="surface surface-alert is-success">
          <p>Message sent and logged on the customer record.</p>
        </div>
      ) : null}
      {(query as Record<string, string>).reminder === "created" ? (
        <div className="surface surface-alert is-success">
          <p>Rebook reminder set.</p>
        </div>
      ) : null}
      {query.error ? (
        <div className="surface surface-alert is-danger">
          <p>Something went wrong. Check your integrations and try again.</p>
        </div>
      ) : null}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Jobs</div>
            <div className="setup-summary-value">{customer.jobs.length}</div>
            <p className="setup-summary-copy">Work records already attached to this customer.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Quotes</div>
            <div className="setup-summary-value">{customer.quotes.length}</div>
            <p className="setup-summary-copy">Drafted or accepted quote history on the account.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Invoices</div>
            <div className="setup-summary-value">{customer.invoices.length}</div>
            <p className="setup-summary-copy">Billing records tied back to the same customer.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Contact details</div>
            <h2 style={{ marginBottom: 8 }}>Contact details</h2>
          </div>

          <div className="setup-list">
            {[
              ["Email", customer.email],
              ["Phone", customer.phone ?? "Not set"],
              ["Address", customer.address ?? "Not set"],
              ["Suburb", customer.suburb ?? "Not set"],
              ["Rating", customer.ratingAverage?.toFixed(1) ?? "No ratings yet"]
            ].map(([label, value]) => (
              <div key={label} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{label}</span>
                  </div>
                  <p>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action={`/api/tenant/crm/customers/${customer.id}/update`} method="post" className="surface form-grid">
          <div className="setup-section-copy">
            <div className="eyebrow">Edit customer</div>
            <h2 style={{ marginBottom: 8 }}>Edit customer</h2>
            <p>Changes apply across all jobs, invoices, and records linked to this customer.</p>
          </div>

          <input type="hidden" name="returnTo" value={`/dashboard/crm/${customer.id}`} />

          <div className="setup-field-grid">
            <label className="label">
              First name
              <input className="input" name="firstName" defaultValue={customer.firstName} required />
            </label>
            <label className="label">
              Last name
              <input className="input" name="lastName" defaultValue={customer.lastName} required />
            </label>
            <label className="label">
              Email
              <input className="input" name="email" type="email" defaultValue={customer.email} required />
            </label>
            <label className="label">
              Phone
              <input className="input" name="phone" defaultValue={customer.phone ?? ""} />
            </label>
            <label className="label">
              Address
              <input className="input" name="address" defaultValue={customer.address ?? ""} />
            </label>
            <label className="label">
              Suburb
              <input className="input" name="suburb" defaultValue={customer.suburb ?? ""} />
            </label>
            <label className="label is-full">
              Notes
              <textarea className="textarea" name="notes" defaultValue={customer.notes ?? ""} />
            </label>
          </div>

          <button className="cta" type="submit">Save customer</button>
        </form>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Jobs</div>
            <h2 style={{ marginBottom: 8 }}>Work history</h2>
            <p>All jobs linked to this customer.</p>
          </div>

          <div className="setup-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {customer.jobs.length > 0 ? customer.jobs.map((job) => (
                  <tr key={job.id}>
                    <td><Link className="inline-entity-link" href={getJobRecordHref(job.id)}>{job.summary}</Link></td>
                    <td>{job.status}</td>
                    <td>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ color: "#64748b", textAlign: "center" }}>No jobs recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Invoices</div>
            <h2 style={{ marginBottom: 8 }}>Billing history</h2>
            <p>Outstanding or historic invoices remain easy to reopen from the customer record.</p>
          </div>

          <div className="setup-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.length > 0 ? customer.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></td>
                    <td>{invoice.status}</td>
                    <td>${invoice.amount}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ color: "#64748b", textAlign: "center" }}>No invoices recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <ManualCommunicationForm
          customerId={customer.id}
          returnTo={`/dashboard/crm/${customer.id}`}
          title="Send manual message"
        />

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Recent communication</div>
            <h2 style={{ marginBottom: 8 }}>Latest outreach</h2>
            <p>All messages sent to or from this customer.</p>
          </div>

          <div className="setup-list">
            {communications.length > 0 ? communications.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="setup-note">No communication recorded for this customer yet.</p>}
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Enquiries</div>
            <h2>New requests still tied to this customer</h2>
            <p>Open the linked quote or track the status of each request.</p>
          </div>
        </div>

        <div className="setup-list">
          {enquiries.length > 0 ? enquiries.map((enquiry) => (
            <div key={enquiry.id} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${enquiry.status === "new" ? "is-warning" : "is-off"}`}>{enquiry.status}</span>
                  <span>{new Date(enquiry.createdAt).toLocaleString()}</span>
                </div>
                <h3>{enquiry.serviceRequest}</h3>
              </div>
              <div className="setup-row-actions">
                {enquiry.quote ? (
                  <Link className="ghost" href={`/quote/${enquiry.quote.accessToken}`}>Open linked quote</Link>
                ) : null}
              </div>
            </div>
          )) : <p className="setup-note">No enquiries recorded for this customer yet.</p>}
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Quotes and agreements</div>
            <h2 style={{ marginBottom: 8 }}>Commercial history</h2>
            <p>Quotes sent and agreements signed for this customer.</p>
          </div>

          <div className="setup-list">
            {customer.quotes.map((quote) => (
              <div key={quote.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">Quote</span>
                    <span>{quote.status}</span>
                  </div>
                  <h3>{quote.title}</h3>
                  <p>${quote.amount}</p>
                </div>
              </div>
            ))}
            {customer.agreements.map((agreement) => (
              <div key={agreement.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">Agreement</span>
                    <span>{agreement.status}</span>
                  </div>
                  <h3>{agreement.title}</h3>
                </div>
              </div>
            ))}
            {customer.quotes.length === 0 && customer.agreements.length === 0 ? (
              <p className="setup-note">No quotes or agreements recorded yet.</p>
            ) : null}
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Feedback and reminders</div>
            <h2 style={{ marginBottom: 8 }}>Follow-up signals</h2>
            <p>Post-job feedback and upcoming rebook reminders.</p>
          </div>

          <div className="setup-list">
            {feedback.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            ))}
            {reminders.map((reminder) => (
              <div key={reminder.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${reminder.status === "pending" ? "is-warning" : "is-off"}`}>Rebook reminder</span>
                  </div>
                  <p>{reminder.status} · due {new Date(reminder.dueAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {feedback.length === 0 && reminders.length === 0 ? (
              <p className="setup-note">
                No feedback or rebook reminders recorded for <CustomerLink customerId={customer.id} className="inline-entity-link">{customer.firstName}</CustomerLink> yet.
              </p>
            ) : null}

            <div className="setup-row" style={{ paddingTop: 16 }}>
              <form className="form-grid" action="/api/tenant/reminders/create" method="post" style={{ width: "100%" }}>
                <input type="hidden" name="customerId" value={customer.id} />
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label className="label" style={{ flex: 1, minWidth: 180 }}>
                    Remind me on
                    <input className="input" type="date" name="dueAt" required />
                  </label>
                  <button className="ghost" type="submit" style={{ marginBottom: 0 }}>Set reminder</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
