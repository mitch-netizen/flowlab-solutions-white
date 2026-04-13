import Link from "next/link";

import { getTenantCustomers, getTenantInvoices, prisma } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

export default async function InvoicesPage() {
  const session = await requireTenantSession();
  const [invoices, customers, invoiceableJobs] = await Promise.all([
    getTenantInvoices(session.tenantId),
    getTenantCustomers(session.tenantId),
    prisma.job.findMany({
      where: {
        tenantId: session.tenantId,
        status: { in: ["complete", "in_progress", "scheduled"] },
        invoice: null
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Invoice customers clearly and keep payment status visible."
        description="Create invoices, send secure payment links, and rely on reminder automation to keep overdue balances from slipping out of sight."
        section="revenue"
      />
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
            Related job
            <select className="select" name="jobId" defaultValue="">
              <option value="">No linked job</option>
              {invoiceableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.summary} · {job.customer.firstName} {job.customer.lastName}
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
              <th>Job</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Public link</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></td>
                <td>{invoice.job ? <Link className="inline-entity-link" href={getJobRecordHref(invoice.job.id)}>{invoice.job.summary}</Link> : "—"}</td>
                <td>
                  <CustomerLink customerId={invoice.customer.id} className="inline-entity-link">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </CustomerLink>
                </td>
                <td>{invoice.status}</td>
                <td>${invoice.amount}</td>
                <td>
                  <Link href={getInvoiceRecordHref(invoice.id)}>Open record</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
