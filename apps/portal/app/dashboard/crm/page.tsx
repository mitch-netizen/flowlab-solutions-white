import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage() {
  const session = await requireTenantSession();
  const snapshot = await getCrmSnapshot(session.tenantId);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="CRM"
        title="See customer history, communication, and risk in one place."
        description="Use the CRM as your customer control panel: who is active, who needs a follow-up, who is overdue, and where the strongest relationships are forming."
        section="crm"
      />
      <div className="cards-3">
        <div className="surface-soft">
          <strong>Customers</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.customers.length}</div>
        </div>
        <div className="surface-soft">
          <strong>Open enquiries</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.enquiries.filter((entry) => entry.status === "new").length}</div>
        </div>
        <div className="surface-soft">
          <strong>Overdue invoices</strong>
          <div style={{ fontSize: 30, marginTop: 10 }}>{snapshot.overdueInvoices.length}</div>
        </div>
      </div>
      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/crm/customers" method="post">
          <h2 style={{ marginTop: 0 }}>Add customer</h2>
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
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Why CRM matters here</h2>
          <div className="surface-soft">
            CRM is the customer system of record inside FlowLab. Quotes, jobs, agreements, invoices, reminders, and feedback all hang off the same customer record.
          </div>
          <div className="surface-soft" style={{ marginTop: 18 }}>
            When Xero is connected, new customers are linked to the same Xero contact so billing stays consistent instead of forking across systems.
          </div>
        </div>
      </div>
      <div className="surface">
        <h2 style={{ marginTop: 0 }}>Recent enquiries</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Request</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.enquiries.map((enquiry) => (
              <tr key={enquiry.id}>
                <td>
                  <CustomerLink customerId={enquiry.customerId} className="inline-entity-link">
                    {enquiry.customer.firstName} {enquiry.customer.lastName}
                  </CustomerLink>
                </td>
                <td>{enquiry.serviceRequest}</td>
                <td>{enquiry.status}</td>
                <td>{new Date(enquiry.createdAt).toLocaleString()}</td>
                <td>
                  {enquiry.quote ? (
                    <Link href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                  ) : (
                    <Link href={`/dashboard/quotes?customerId=${enquiry.customerId}&enquiryId=${enquiry.id}`}>Create quote</Link>
                  )}
                </td>
              </tr>
            ))}
            {snapshot.enquiries.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "#64748b", textAlign: "center" }}>
                  No enquiries captured yet. Your public enquiry form will feed this queue automatically.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
