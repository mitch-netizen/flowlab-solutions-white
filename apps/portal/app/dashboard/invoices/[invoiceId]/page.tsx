import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantInvoiceRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageScaffold from "../../../../components/dashboard/page-scaffold";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
import SubmitButton from "../../../../components/submit-button";
import { getJobRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function InvoiceRecordPage({
  params,
  searchParams
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const { invoiceId } = await params;
  const query = await searchParams;
  const record = await getTenantInvoiceRecord(session.tenantId, invoiceId);

  if (!record) {
    notFound();
  }

  const { invoice, invoiceCommunications, customerCommunications, otherCustomerJobs } = record;

  return (
    
      <DashboardPageScaffold
        eyebrow="Revenue"
        title={invoice.number}
        description="Invoice status, payment details, linked job, and customer communication in one place."
        section="revenue"
        actions={(
          <>
            <CustomerLink customerId={invoice.customerId} className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open customer</CustomerLink>
            <form action={`/api/tenant/invoices/${invoice.id}/sync`} method="post">
              <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Syncing...">Sync from Xero</SubmitButton>
            </form>
            {invoice.status !== "paid" && invoice.status !== "voided" ? (
              <form action={`/api/tenant/invoices/${invoice.id}/mark-paid`} method="post">
                <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Marking paid...">Mark as paid</SubmitButton>
              </form>
            ) : null}
            {invoice.paymentLink ? (
              <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={invoice.paymentLink} target="_blank" rel="noreferrer">
                {invoice.xeroInvoiceId ? "Open Xero invoice" : "Open online invoice"}
              </a>
            ) : null}
          </>
        )}
      >

      {query.message === "sent" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Message sent and linked to this invoice.</p>
        </div>
      ) : query.message === "marked_paid" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Invoice marked as paid. Payment confirmation automation queued.</p>
        </div>
      ) : query.message === "already_paid" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-amber-500">
          <p>This invoice is already marked as paid.</p>
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-red-500">
          <p>Something went wrong. Please try again.</p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="text-3xl font-semibold capitalize">{invoice.status}</div>
            <p className="text-sm text-muted-foreground">Xero status: {invoice.xeroStatus ?? "Unknown"}.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Amount</div>
            <div className="text-3xl font-semibold">${invoice.amount}</div>
            <p className="text-sm text-muted-foreground">Total amount currently due on this invoice.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Due date</div>
            <div className="text-2xl font-semibold leading-tight">
              {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "No due date"}
            </div>
            <p className="text-sm text-muted-foreground">{invoice.paidAt ? `Paid ${new Date(invoice.paidAt).toLocaleString()}` : "Payment not recorded yet."}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Customer and payment</div>
            <h2>Billing details</h2>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Customer</span>
                </div>
                <p>
                  <CustomerLink customerId={invoice.customerId} className="inline-entity-link">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </CustomerLink>
                </p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Email</span>
                </div>
                <p>{invoice.customer.email}</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Paid at</span>
                </div>
                <p>{invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "Not paid yet"}</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Payment link</span>
                </div>
                <p>
                  {invoice.paymentLink ? (
                    <a className="inline-entity-link" href={invoice.paymentLink} target="_blank" rel="noreferrer">
                      {invoice.xeroInvoiceId ? "Open Xero invoice" : "Open online invoice"}
                    </a>
                  ) : invoice.xeroInvoiceId ?? "Not synced yet"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Related jobs</div>
            <h2>Nearby work history</h2>
            <p>The job this invoice was raised for, plus other recent work for this customer.</p>
          </div>

          <div className="space-y-3">
            {invoice.job ? (
              <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-on">Linked job</span>
                    <span>{invoice.job.status}</span>
                  </div>
                  <h3>
                    <Link className="inline-entity-link" href={getJobRecordHref(invoice.job.id)}>
                      {invoice.job.summary}
                    </Link>
                  </h3>
                </div>
              </div>
            ) : null}

            {otherCustomerJobs.length > 0 ? otherCustomerJobs.map((job) => (
              <div key={job.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{job.status}</span>
                    <span>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</span>
                  </div>
                  <h3>
                    <Link className="inline-entity-link" href={getJobRecordHref(job.id)}>
                      {job.summary}
                    </Link>
                  </h3>
                </div>
              </div>
            )) : !invoice.job ? <p className="text-sm text-muted-foreground">No related jobs found for this customer yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <ManualCommunicationForm
          customerId={invoice.customerId}
          invoiceId={invoice.id}
          returnTo={`/dashboard/invoices/${invoice.id}`}
          title="Send invoice follow-up"
        />

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Invoice communication</div>
            <h2>Invoice messages</h2>
            <p>Messages sent specifically about this invoice.</p>
          </div>

          <div className="space-y-3">
            {invoiceCommunications.length > 0 ? invoiceCommunications.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No invoice-linked communication recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Customer communication</div>
          <h2>Broader customer timeline</h2>
          <p>Other messages sent to this customer, for context.</p>
        </div>

        <div className="space-y-3">
          {customerCommunications.length > 0 ? customerCommunications.map((entry) => (
            <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                  <span>{entry.status}</span>
                </div>
                <p>{entry.subject ?? entry.body}</p>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No broader customer communication recorded yet.</p>}
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
