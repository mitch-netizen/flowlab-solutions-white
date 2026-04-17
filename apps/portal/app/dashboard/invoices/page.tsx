import Link from "next/link";

import { getTenantCustomers, getTenantIntegrationRecord, getTenantInvoices, prisma } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ jobId?: string; customerId?: string; synced?: string; failed?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const prefilledJobId = query.jobId ?? "";
  const prefilledCustomerId = query.customerId ?? "";
  const syncedCount = Number(query.synced ?? 0);
  const failedCount = Number(query.failed ?? 0);

  const [invoices, customers, invoiceableJobs, xeroIntegration] = await Promise.all([
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
    }),
    getTenantIntegrationRecord(session.tenantId, "xero")
  ]);
  const xeroConnected = xeroIntegration?.status === "connected";

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Invoices"
        description="Create invoices via Xero, track payment status, and keep billing linked to the right job and customer."
        section="revenue"
        actions={xeroConnected ? (
          <form action="/api/tenant/invoices/sync" method="post">
            <button className="ghost" type="submit">Sync open invoices from Xero</button>
          </form>
        ) : undefined}
      />
      {query.error === "xero_sync_failed" ? (
        <div className="surface" style={{ borderLeft: "3px solid #ef4444", color: "#fecaca" }}>
          Could not refresh invoice status from Xero. Check the Xero connection and try again.
        </div>
      ) : null}
      {syncedCount > 0 || failedCount > 0 ? (
        <div className="surface" style={{ borderLeft: "3px solid #38bdf8" }}>
          <strong>Invoice sync complete.</strong>
          <div style={{ color: "#cbd5e1", marginTop: 8 }}>
            {syncedCount} invoice{syncedCount === 1 ? "" : "s"} refreshed from Xero{failedCount > 0 ? `, ${failedCount} failed.` : "."}
          </div>
        </div>
      ) : null}
      {!xeroConnected ? (
        <div className="surface" style={{ borderLeft: "3px solid #f59e0b" }}>
          <h2 style={{ marginTop: 0, color: "#fde68a" }}>Connect Xero before invoicing</h2>
          <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
            Invoices are created and managed in Xero. Connect your account to keep payment state accurate and synced.
          </p>
          <Link href="/dashboard/integrations" className="cta" style={{ display: "inline-block" }}>
            Open integrations
          </Link>
        </div>
      ) : null}
      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/invoices/create" method="post">
          <h2 style={{ marginTop: 0 }}>Create invoice</h2>
          <label className="label">
            Customer
            <select className="select" name="customerId" required defaultValue={prefilledCustomerId}>
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
            <select className="select" name="jobId" defaultValue={prefilledJobId}>
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
            <input className="input" name="note" defaultValue="Invoice for services rendered." />
          </label>
          <button className="cta" type="submit">
            Create invoice
          </button>
        </form>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Revenue rules</h2>
          <div className="surface-soft">
            Invoices are created in Xero first. The invoice number, status, payment URL, and linked customer/job are mirrored here automatically.
          </div>
          <div className="surface-soft" style={{ marginTop: 18 }}>
            If a customer pays or the invoice changes in Xero, use the sync action above to pull the latest status back.
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
              <th>Xero</th>
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
                <td>{invoice.xeroStatus ?? "Not synced"}</td>
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
