import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage({
  searchParams
}: {
  searchParams: Promise<{ closed?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const snapshot = await getCrmSnapshot(session.tenantId);

  const openEnquiries = snapshot.enquiries.filter((entry) => entry.status === "new");
  const customersWithOverdueInvoices = new Set(snapshot.overdueInvoices.map((invoice) => invoice.customerId)).size;
  const activeCustomers = snapshot.customers.filter((customer) => customer.jobs.length > 0 || customer.quotes.length > 0).length;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="CRM"
        title="Customer context without the noise."
        description="Track who is new, who needs a follow-up, and who already has work, billing, or feedback history attached to their record."
        section="crm"
      />

      {query.closed === "1" ? (
        <div className="surface" style={{ borderLeft: "3px solid #22c55e" }}>
          Enquiry closed and removed from the active queue.
        </div>
      ) : null}

      {query.error ? (
        <div className="surface" style={{ borderLeft: "3px solid #ef4444" }}>
          FlowLab could not complete that CRM action.
        </div>
      ) : null}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Customers</div>
            <div className="setup-summary-value">{snapshot.customers.length}</div>
            <p className="setup-summary-copy">{activeCustomers} currently have jobs or quotes attached.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Open enquiries</div>
            <div className="setup-summary-value">{openEnquiries.length}</div>
            <p className="setup-summary-copy">New requests still waiting for a quote or manual close-out.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Billing risk</div>
            <div className="setup-summary-value">{snapshot.overdueInvoices.length}</div>
            <p className="setup-summary-copy">{customersWithOverdueInvoices} customer{customersWithOverdueInvoices === 1 ? "" : "s"} have overdue invoices.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/crm/customers" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">New customer</div>
            <h2 style={{ marginBottom: 8 }}>Add a customer record</h2>
            <p>Create the contact once and let FlowLab hang quotes, jobs, invoices, communication, and feedback off the same record.</p>
          </div>
          <label className="label">
            First name
            <input className="input" name="firstName" required />
          </label>
          <label className="label">
            Last name
            <input className="input" name="lastName" required />
          </label>
          <label className="label">
            Email
            <input className="input" name="email" type="email" required />
          </label>
          <label className="label">
            Phone
            <input className="input" name="phone" />
          </label>
          <label className="label">
            Address
            <input className="input" name="address" />
          </label>
          <label className="label">
            Suburb
            <input className="input" name="suburb" />
          </label>
          <label className="label">
            Notes
            <textarea className="textarea" name="notes" placeholder="Anything the operator should remember about this customer." />
          </label>
          <button className="cta" type="submit">Create customer</button>
        </form>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Priority view</div>
            <h2 style={{ marginBottom: 8 }}>What deserves attention first</h2>
            <p>This screen is most useful when it acts like a triage board, not a contact database.</p>
          </div>

          <div className="setup-list">
            <div className="setup-row" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${openEnquiries.length > 0 ? "is-warning" : "is-off"}`}>{openEnquiries.length > 0 ? "Open" : "Clear"}</span>
                </div>
                <h3>Enquiry queue</h3>
                <p>{openEnquiries.length > 0 ? `${openEnquiries.length} new enquiry${openEnquiries.length === 1 ? "" : "ies"} need a quote or close-out.` : "No fresh enquiries are waiting right now."}</p>
              </div>
              <div className="setup-row-actions">
                <Link className="ghost" href="#recent-enquiries">Review enquiries</Link>
              </div>
            </div>

            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${snapshot.overdueInvoices.length > 0 ? "is-warning" : "is-off"}`}>{snapshot.overdueInvoices.length > 0 ? "Overdue" : "Clear"}</span>
                </div>
                <h3>Billing follow-up</h3>
                <p>{snapshot.overdueInvoices.length > 0 ? `${snapshot.overdueInvoices.length} invoice${snapshot.overdueInvoices.length === 1 ? "" : "s"} are overdue across ${customersWithOverdueInvoices} customer${customersWithOverdueInvoices === 1 ? "" : "s"}.` : "No overdue invoices are linked to CRM customers."}</p>
              </div>
              <div className="setup-row-actions">
                <Link className="ghost" href="/dashboard/invoices">Open invoices</Link>
              </div>
            </div>

            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Record quality</span>
                </div>
                <h3>Unified customer history</h3>
                <p>Quotes, jobs, invoices, reminders, and feedback all live on the same customer record, which keeps the operator from bouncing between disconnected screens.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="recent-enquiries" className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Recent enquiries</div>
            <h2>New requests should read like a queue, not a spreadsheet</h2>
            <p>Each enquiry needs one clear next action: open the quote that exists already, create one, or close the request if it is no longer active.</p>
          </div>
        </div>

        <div className="setup-list">
          {snapshot.enquiries.length > 0 ? (
            snapshot.enquiries.map((enquiry) => (
              <div key={enquiry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${enquiry.status === "new" ? "is-warning" : "is-off"}`}>{enquiry.status}</span>
                    <span>{new Date(enquiry.createdAt).toLocaleString()}</span>
                  </div>
                  <h3>
                    <CustomerLink customerId={enquiry.customerId} className="inline-entity-link">
                      {enquiry.customer.firstName} {enquiry.customer.lastName}
                    </CustomerLink>
                  </h3>
                  <p>{enquiry.serviceRequest}</p>
                </div>
                <div className="setup-row-actions">
                  {enquiry.quote ? (
                    <Link className="ghost" href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                  ) : (
                    <>
                      <Link className="ghost" href={`/dashboard/quotes?customerId=${enquiry.customerId}&enquiryId=${enquiry.id}`}>Create quote</Link>
                      <form action={`/api/tenant/enquiries/${enquiry.id}/close`} method="post">
                        <input type="hidden" name="returnTo" value="/dashboard/crm" />
                        <button className="ghost" type="submit">Close enquiry</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="setup-note">No enquiries captured yet. Your public enquiry form will feed this queue automatically.</p>
          )}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Customer directory</div>
            <h2>See who has active work, debt, or history worth protecting</h2>
            <p>Keep the table dense enough to scan, but let the customer name stay as the primary link into the full record.</p>
          </div>
        </div>

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
                    <CustomerLink customerId={customer.id} className="inline-entity-link">
                      <strong>
                        {customer.firstName} {customer.lastName}
                      </strong>
                    </CustomerLink>
                    <div style={{ color: "#cbd5e1", marginTop: 6 }}>{customer.email}</div>
                  </td>
                  <td>{customer.suburb ?? "n/a"}</td>
                  <td>{customer.jobs.length}</td>
                  <td>{customer.quotes.length}</td>
                  <td>{customer.invoices.length}</td>
                  <td>{health}</td>
                  <td>
                    <Link href={`/dashboard/quotes?customerId=${customer.id}`}>Quote</Link>
                    {" · "}
                    <Link href={`/dashboard/invoices?customerId=${customer.id}`}>Invoice</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Recent feedback</div>
            <h2 style={{ marginBottom: 8 }}>Customer sentiment</h2>
            <p>Keep the latest feedback close to the CRM so the operator can spot patterns quickly.</p>
          </div>
          <div className="setup-list">
            {snapshot.feedback.length > 0 ? snapshot.feedback.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            )) : <p className="setup-note">No feedback recorded yet.</p>}
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Recent communication</div>
            <h2 style={{ marginBottom: 8 }}>Latest messages and outreach</h2>
            <p>Recent outbound and inbound communication should be easy to skim before anyone calls the customer again.</p>
          </div>
          <div className="setup-list">
            {snapshot.communications.length > 0 ? snapshot.communications.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="setup-note">No communication recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
