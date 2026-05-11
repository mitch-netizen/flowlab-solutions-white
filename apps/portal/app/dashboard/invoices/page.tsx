import Link from "next/link";

import { getTenantCustomers, getTenantIntegrationRecord, getTenantInvoices, prisma } from "@flowlab/db";
import { Badge, formatCurrency, formatLabel, getStatusTone } from "@flowlab/ui";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../components/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import InvoiceCreateForm from "./InvoiceCreateForm";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

const invoiceCreateErrors: Record<string, string> = {
  invalid_input: "Customer and a positive amount are required.",
  customer_not_found: "That customer could not be found. Try refreshing the page.",
  xero_contact_failed: "Could not sync the customer to Xero. Check the Xero connection and try again.",
  xero_invoice_failed: "Invoice was not created in Xero. Check the Xero connection and try again.",
  xero_required: "Connect Xero before creating invoices.",
};

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
            <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Syncing...">Sync open invoices from Xero</SubmitButton>
          </form>
        ) : undefined}
      >
      {query.error === "xero_sync_failed" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-red-500 text-red-200">
          Could not refresh invoice status from Xero. Check the Xero connection and try again.
        </div>
      ) : query.error && invoiceCreateErrors[query.error] ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-red-500 text-red-200">
          {invoiceCreateErrors[query.error]}
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
        <InvoiceCreateForm
          customers={customers}
          invoiceableJobs={invoiceableJobs}
          prefilledCustomerId={prefilledCustomerId}
          prefilledJobId={prefilledJobId}
        />
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">How it works</div>
            <h2>Xero-powered billing</h2>
            <p className="text-sm text-muted-foreground">Invoices live in Xero — FlowLab mirrors them so you can track status without leaving the dashboard.</p>
          </div>
          <div className="space-y-3">
            <div className="grid gap-4 border-t pt-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">1. Create here → appears in Xero</div>
                <p className="text-sm text-muted-foreground">When you create an invoice, it is pushed to Xero immediately. The invoice number and payment link are mirrored back.</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">2. Customer pays in Xero → sync to update</div>
                <p className="text-sm text-muted-foreground">Payment status does not auto-update. Use "Sync open invoices" to pull the latest status from Xero after payments come in.</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">3. Paid invoices move the job to Done</div>
                <p className="text-sm text-muted-foreground">Once an invoice syncs as paid, the linked job status updates automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Billing history</div>
            <h2>All invoices</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/invoices" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold">All</Link>
            <Link href="/dashboard/invoices?status=open" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold">Open</Link>
            <Link href="/dashboard/invoices?status=overdue" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold">Overdue</Link>
          </div>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet. Create your first invoice above and it will appear here once it is pushed to Xero.</p>
        ) : (
          <Table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Xero</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></TableCell>
                  <TableCell>
                    <CustomerLink customerId={invoice.customer.id} className="inline-entity-link">
                      {invoice.customer.firstName} {invoice.customer.lastName}
                    </CustomerLink>
                  </TableCell>
                  <TableCell><Badge tone={getStatusTone(invoice.status)}>{formatLabel(invoice.status)}</Badge></TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>{invoice.job ? <Link className="inline-entity-link" href={getJobRecordHref(invoice.job.id)}>{invoice.job.summary}</Link> : "—"}</TableCell>
                  <TableCell><Badge tone={getStatusTone(invoice.xeroStatus)}>{invoice.xeroStatus ? formatLabel(invoice.xeroStatus) : "Not synced"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardPageScaffold>
  );
}
