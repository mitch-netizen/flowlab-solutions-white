import Link from "next/link";

import { getTenantCustomers, getTenantIntegrationRecord, getTenantInvoices, prisma } from "@flowlab/db";
import { Badge, formatCurrency, formatLabel, getStatusTone } from "@flowlab/ui";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
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
    
      <DashboardPageScaffold
        eyebrow="Revenue"
        title="Invoices"
        description="Create invoices via Xero, track payment status, and keep billing linked to the right job and customer."
        section="revenue"
        actions={xeroConnected ? (
          <form action="/api/tenant/invoices/sync" method="post">
            <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Sync open invoices from Xero</button>
          </form>
        ) : undefined}
      >
      {query.error === "xero_sync_failed" ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #ef4444", color: "#fecaca" }}>
          Could not refresh invoice status from Xero. Check the Xero connection and try again.
        </div>
      ) : null}
      {syncedCount > 0 || failedCount > 0 ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #38bdf8" }}>
          <strong>Invoice sync complete.</strong>
          <div style={{ color: "#cbd5e1", marginTop: 8 }}>
            {syncedCount} invoice{syncedCount === 1 ? "" : "s"} refreshed from Xero{failedCount > 0 ? `, ${failedCount} failed.` : "."}
          </div>
        </div>
      ) : null}
      {!xeroConnected ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #f59e0b" }}>
          <h2 style={{ marginTop: 0, color: "#fde68a" }}>Connect Xero before invoicing</h2>
          <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
            Invoices are created and managed in Xero. Connect your account to keep payment state accurate and synced.
          </p>
          <Link href="/dashboard/integrations" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" style={{ display: "inline-block" }}>
            Open integrations
          </Link>
        </div>
      ) : null}
      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/invoices/create" method="post">
          <h2 style={{ marginTop: 0 }}>Create invoice</h2>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Customer
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerId" required defaultValue={prefilledCustomerId}>
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
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Related job
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="jobId" defaultValue={prefilledJobId}>
              <option value="">No linked job</option>
              {invoiceableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.summary} · {job.customer.firstName} {job.customer.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Amount
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="amount" type="number" min="1" step="0.01" defaultValue="95" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Internal note
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="note" defaultValue="Invoice for services rendered." />
          </label>
          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Create invoice
          </button>
        </form>
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Revenue rules</h2>
          <div className="rounded-lg border bg-card/60 p-4">
            Invoices are created in Xero first. The invoice number, status, payment URL, and linked customer/job are mirrored here automatically.
          </div>
          <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 18 }}>
            If a customer pays or the invoice changes in Xero, use the sync action above to pull the latest status back.
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h2>Recent invoices</h2>
        <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
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
                <td><Badge tone={getStatusTone(invoice.status)}>{formatLabel(invoice.status)}</Badge></td>
                <td><Badge tone={getStatusTone(invoice.xeroStatus)}>{invoice.xeroStatus ? formatLabel(invoice.xeroStatus) : "Not synced"}</Badge></td>
                <td>{formatCurrency(invoice.amount)}</td>
                <td>
                  <Link href={getInvoiceRecordHref(invoice.id)}>Open record</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPageScaffold>
  );
}
