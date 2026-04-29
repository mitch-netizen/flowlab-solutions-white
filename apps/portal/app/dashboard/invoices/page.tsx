import Link from "next/link";

import { getTenantCustomers, getTenantIntegrationRecord, getTenantInvoices, prisma } from "@flowlab/db";
import { Badge, formatCurrency, formatLabel, getStatusTone } from "@flowlab/ui";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
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
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-red-500 text-red-200">
          Could not refresh invoice status from Xero. Check the Xero connection and try again.
        </div>
      ) : null}
      {syncedCount > 0 || failedCount > 0 ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-cyan-400">
          <strong>Invoice sync complete.</strong>
          <div className="text-slate-400 mt-2">
            {syncedCount} invoice{syncedCount === 1 ? "" : "s"} refreshed from Xero{failedCount > 0 ? `, ${failedCount} failed.` : "."}
          </div>
        </div>
      ) : null}
      {!xeroConnected ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-amber-500">
          <h2 className="mt-0 text-amber-200">Connect Xero before invoicing</h2>
          <p className="text-slate-400 mb-4">
            Invoices are created and managed in Xero. Connect your account to keep payment state accurate and synced.
          </p>
          <Link href="/dashboard/integrations" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Open integrations
          </Link>
        </div>
      ) : null}
      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/invoices/create" method="post">
          <h2>Create invoice</h2>
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
          <h2>Revenue rules</h2>
          <div className="rounded-lg border bg-card/60 p-4">
            Invoices are created in Xero first. The invoice number, status, payment URL, and linked customer/job are mirrored here automatically.
          </div>
          <div className="rounded-lg border bg-card/60 p-4 mt-4">
            If a customer pays or the invoice changes in Xero, use the sync action above to pull the latest status back.
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h2>Recent invoices</h2>
        <Table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Xero</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Public link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></TableCell>
                <TableCell>{invoice.job ? <Link className="inline-entity-link" href={getJobRecordHref(invoice.job.id)}>{invoice.job.summary}</Link> : "—"}</TableCell>
                <TableCell>
                  <CustomerLink customerId={invoice.customer.id} className="inline-entity-link">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </CustomerLink>
                </TableCell>
                <TableCell><Badge tone={getStatusTone(invoice.status)}>{formatLabel(invoice.status)}</Badge></TableCell>
                <TableCell><Badge tone={getStatusTone(invoice.xeroStatus)}>{invoice.xeroStatus ? formatLabel(invoice.xeroStatus) : "Not synced"}</Badge></TableCell>
                <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                <TableCell>
                  <Link href={getInvoiceRecordHref(invoice.id)}>Open record</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardPageScaffold>
  );
}
