import Link from "next/link";

import { getTenantCustomers, getTenantInvoices } from "@flowlab/db";

import { requireTenantSession } from "../../../lib/session";

export default async function InvoicesPage() {
  const session = await requireTenantSession();
  const [invoices, customers] = await Promise.all([
    getTenantInvoices(session.tenantId),
    getTenantCustomers(session.tenantId)
  ]);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Invoicing</div>
        <h1>Create invoice drafts and send payment-ready public links.</h1>
        <p style={{ color: "#cbd5e1" }}>The current flow creates invoice records, demo payment links, and payment events that feed the system-health timeline.</p>
      </div>
      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/invoices/create" method="post">
          <h2 style={{ marginTop: 0 }}>Create invoice</h2>
          <label className="label">
            Customer
            <select className="select" name="customerId" required defaultValue="">
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Amount
            <input className="input" name="amount" type="number" min="1" step="0.01" defaultValue="95" required />
          </label>
          <label className="label">
            Internal note
            <input className="input" name="note" defaultValue="Generated from the operator invoice desk." />
          </label>
          <button className="cta" type="submit">
            Create invoice
          </button>
        </form>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Reminder automation fit</h2>
          <div className="surface-soft">
            These invoices are compatible with the day-3, day-7, and day-14 payment reminder blueprint payloads that can be downloaded from Settings.
          </div>
        </div>
      </div>
      <div className="surface">
        <h2>Recent invoices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Public link</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>
                  {invoice.customer.firstName} {invoice.customer.lastName}
                </td>
                <td>{invoice.status}</td>
                <td>${invoice.amount}</td>
                <td>
                  <Link href={`/invoice/${invoice.accessToken}`}>Open invoice</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
