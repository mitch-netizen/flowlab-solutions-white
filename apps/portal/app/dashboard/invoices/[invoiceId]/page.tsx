import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantInvoiceRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
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
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title={invoice.number}
        description="Invoice status, payment details, linked job, and customer communication in one place."
        section="revenue"
        actions={(
          <>
            <CustomerLink customerId={invoice.customerId} className="ghost">Open customer</CustomerLink>
            <form action={`/api/tenant/invoices/${invoice.id}/sync`} method="post">
              <button className="ghost" type="submit">Sync from Xero</button>
            </form>
            {invoice.status !== "paid" && invoice.status !== "voided" ? (
              <form action={`/api/tenant/invoices/${invoice.id}/mark-paid`} method="post">
                <button className="ghost" type="submit">Mark as paid</button>
              </form>
            ) : null}
            {invoice.paymentLink ? (
              <a className="ghost" href={invoice.paymentLink} target="_blank" rel="noreferrer">
                {invoice.xeroInvoiceId ? "Open Xero invoice" : "Open online invoice"}
              </a>
            ) : null}
          </>
        )}
      />

      {query.message === "sent" ? (
        <div className="surface surface-alert is-success">
          <p>Message sent and linked to this invoice.</p>
        </div>
      ) : query.message === "marked_paid" ? (
        <div className="surface surface-alert is-success">
          <p>Invoice marked as paid. Payment confirmation automation queued.</p>
        </div>
      ) : query.message === "already_paid" ? (
        <div className="surface surface-alert is-warning">
          <p>This invoice is already marked as paid.</p>
        </div>
      ) : null}
      {query.error ? (
        <div className="surface surface-alert is-danger">
          <p>Something went wrong. Please try again.</p>
        </div>
      ) : null}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Status</div>
            <div className="setup-summary-value" style={{ textTransform: "capitalize" }}>{invoice.status}</div>
            <p className="setup-summary-copy">Xero status: {invoice.xeroStatus ?? "Unknown"}.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Amount</div>
            <div className="setup-summary-value">${invoice.amount}</div>
            <p className="setup-summary-copy">Total amount currently due on this invoice.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Due date</div>
            <div className="setup-summary-value" style={{ fontSize: "1.5rem", lineHeight: 1.15 }}>
              {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "No due date"}
            </div>
            <p className="setup-summary-copy">{invoice.paidAt ? `Paid ${new Date(invoice.paidAt).toLocaleString()}` : "Payment not recorded yet."}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Customer and payment</div>
            <h2 style={{ marginBottom: 8 }}>Customer &amp; payment</h2>
          </div>

          <div className="setup-list">
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Customer</span>
                </div>
                <p>
                  <CustomerLink customerId={invoice.customerId} className="inline-entity-link">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </CustomerLink>
                </p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Email</span>
                </div>
                <p>{invoice.customer.email}</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Paid at</span>
                </div>
                <p>{invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "Not paid yet"}</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
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

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Related jobs</div>
            <h2 style={{ marginBottom: 8 }}>Nearby work history</h2>
            <p>The job this invoice was raised for, plus other recent work for this customer.</p>
          </div>

          <div className="setup-list">
            {invoice.job ? (
              <div className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
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
              <div key={job.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
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
            )) : !invoice.job ? <p className="setup-note">No related jobs found for this customer yet.</p> : null}
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

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Invoice communication</div>
            <h2 style={{ marginBottom: 8 }}>Messages linked directly to this invoice</h2>
            <p>Messages sent specifically about this invoice.</p>
          </div>

          <div className="setup-list">
            {invoiceCommunications.length > 0 ? invoiceCommunications.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="setup-note">No invoice-linked communication recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-copy">
          <div className="eyebrow">Customer communication</div>
          <h2 style={{ marginBottom: 8 }}>Broader customer timeline</h2>
          <p>Other messages sent to this customer, for context.</p>
        </div>

        <div className="setup-list">
          {customerCommunications.length > 0 ? customerCommunications.map((entry) => (
            <div key={entry.id} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                  <span>{entry.status}</span>
                </div>
                <p>{entry.subject ?? entry.body}</p>
              </div>
            </div>
          )) : <p className="setup-note">No broader customer communication recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
