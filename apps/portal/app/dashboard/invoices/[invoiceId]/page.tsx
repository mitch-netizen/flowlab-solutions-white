import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantInvoiceRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import { getJobRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function InvoiceRecordPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireTenantSession();
  const { invoiceId } = await params;
  const record = await getTenantInvoiceRecord(session.tenantId, invoiceId);

  if (!record) {
    notFound();
  }

  const { invoice, communications, otherCustomerJobs } = record;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title={invoice.number}
        description="Review invoice status, customer context, payment timing, and the nearby work history from one place."
        section="revenue"
        actions={(
          <>
            <CustomerLink customerId={invoice.customerId} className="ghost">Open customer</CustomerLink>
            {invoice.paymentLink ? <a className="ghost" href={invoice.paymentLink} target="_blank" rel="noreferrer">Open payment link</a> : null}
          </>
        )}
      />

      <div className="cards-3">
        <div className="surface-soft">
          <strong>Status</strong>
          <div style={{ fontSize: 26, marginTop: 10, textTransform: "capitalize" }}>{invoice.status}</div>
        </div>
        <div className="surface-soft">
          <strong>Amount</strong>
          <div style={{ fontSize: 26, marginTop: 10 }}>${invoice.amount}</div>
        </div>
        <div className="surface-soft">
          <strong>Due</strong>
          <div style={{ fontSize: 18, marginTop: 10 }}>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "No due date"}</div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Customer and payment</h2>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <strong>Customer</strong>
              <div style={{ color: "#cbd5e1", marginTop: 6 }}>
                <CustomerLink customerId={invoice.customerId} className="inline-entity-link">
                  {invoice.customer.firstName} {invoice.customer.lastName}
                </CustomerLink>
              </div>
            </div>
            <div><strong>Email</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{invoice.customer.email}</div></div>
            <div><strong>Paid at</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "Not paid yet"}</div></div>
            <div><strong>Access link</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{invoice.paymentLink ? <a className="inline-entity-link" href={invoice.paymentLink} target="_blank" rel="noreferrer">Open payment page</a> : "Not generated"}</div></div>
          </div>
        </div>

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Related jobs</h2>
          <div className="stack">
            {invoice.job ? (
              <div className="surface-soft">
                <strong>Linked job</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  <Link className="inline-entity-link" href={getJobRecordHref(invoice.job.id)}>{invoice.job.summary}</Link>
                  {" "}· {invoice.job.status}
                </div>
              </div>
            ) : null}
            {otherCustomerJobs.length > 0 ? otherCustomerJobs.map((job) => (
              <div key={job.id} className="surface-soft">
                <Link className="inline-entity-link" href={getJobRecordHref(job.id)}>{job.summary}</Link>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{job.status} · {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</div>
              </div>
            )) : !invoice.job ? <div className="surface-soft">No related jobs found for this customer yet.</div> : null}
          </div>
        </div>
      </div>

      <div className="surface">
        <h2 style={{ marginTop: 0 }}>Recent communication</h2>
        <div className="stack">
          {communications.length > 0 ? communications.map((entry) => (
            <div key={entry.id} className="surface-soft">
              <strong>{entry.channel.toUpperCase()} · {entry.status}</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.subject ?? entry.body}</div>
            </div>
          )) : <div className="surface-soft">No communication logged for this customer yet.</div>}
        </div>
      </div>
    </div>
  );
}
