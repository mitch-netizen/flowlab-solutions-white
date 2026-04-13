import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantJobRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import { getInvoiceRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function JobRecordPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireTenantSession();
  const { jobId } = await params;
  const record = await getTenantJobRecord(session.tenantId, jobId);

  if (!record) {
    notFound();
  }

  const { job, otherCustomerInvoices, communications, feedback } = record;
  const linkedInvoice = job.invoice ?? null;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Workspace"
        title={job.summary}
        description="This job card keeps the operational context together: customer, status, timing, related billing, and recent communication."
        section="workspace"
        actions={(
          <>
            <CustomerLink customerId={job.customerId} className="ghost">Open customer</CustomerLink>
            {linkedInvoice ? <Link className="ghost" href={getInvoiceRecordHref(linkedInvoice.id)}>Open linked invoice</Link> : null}
          </>
        )}
      />

      <div className="cards-3">
        <div className="surface-soft">
          <strong>Status</strong>
          <div style={{ fontSize: 26, marginTop: 10, textTransform: "capitalize" }}>{job.status.replace(/_/g, " ")}</div>
        </div>
        <div className="surface-soft">
          <strong>Scheduled</strong>
          <div style={{ fontSize: 18, marginTop: 10 }}>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</div>
        </div>
        <div className="surface-soft">
          <strong>Hours</strong>
          <div style={{ fontSize: 18, marginTop: 10 }}>
            Est {job.estimatedHours ?? "—"} · Actual {job.actualHours ?? "—"}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Job details</h2>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <strong>Customer</strong>
              <div style={{ color: "#cbd5e1", marginTop: 6 }}>
                <CustomerLink customerId={job.customerId} className="inline-entity-link">
                  {job.customer.firstName} {job.customer.lastName}
                </CustomerLink>
              </div>
            </div>
            <div><strong>Address</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{job.address ?? job.customer.address ?? "Not set"}</div></div>
            <div><strong>Suburb</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{job.suburb ?? job.customer.suburb ?? "Not set"}</div></div>
            <div><strong>Weather risk</strong><div style={{ color: "#cbd5e1", marginTop: 6 }}>{job.weatherRisk ? "Flagged" : "Clear"}</div></div>
          </div>
        </div>

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Billing trail</h2>
          <div className="stack">
            {linkedInvoice ? (
              <div className="surface-soft">
                <strong>Linked invoice</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  <Link className="inline-entity-link" href={getInvoiceRecordHref(linkedInvoice.id)}>
                    {linkedInvoice.number}
                  </Link>
                  {" "}· {linkedInvoice.status} · ${linkedInvoice.amount}
                </div>
              </div>
            ) : (
              <div className="surface-soft">No invoice linked from this job yet.</div>
            )}
            {job.status === "complete" && !linkedInvoice ? (
              <form action="/api/tenant/invoices/create" method="post" className="surface-soft form-grid">
                <input type="hidden" name="customerId" value={job.customerId} />
                <input type="hidden" name="jobId" value={job.id} />
                <label className="label">
                  Invoice amount
                  <input className="input" name="amount" type="number" min="1" step="0.01" defaultValue={job.estimatedHours ? Number(job.estimatedHours * 65).toFixed(2) : "95"} required />
                </label>
                <label className="label">
                  Internal note
                  <input className="input" name="note" defaultValue={`Invoice for ${job.summary}`} />
                </label>
                <button className="cta" type="submit">Create linked invoice</button>
              </form>
            ) : null}
            {otherCustomerInvoices.slice(0, 4).map((invoice) => (
              <div key={invoice.id} className="surface-soft">
                <strong>Other invoice for this customer</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  <Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link>
                  {" "}· {invoice.status} · ${invoice.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cards-2">
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

        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Feedback</h2>
          <div className="stack">
            {feedback.length > 0 ? feedback.map((entry) => (
              <div key={entry.id} className="surface-soft">
                <strong>{entry.rating} stars</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{entry.comment ?? "No comment supplied."}</div>
              </div>
            )) : <div className="surface-soft">No feedback has been recorded for this job or customer yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
