import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantJobRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageHeader from "../../../../components/dashboard-page-header";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
import { getInvoiceRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function JobRecordPage({
  params,
  searchParams
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ scheduled?: string; actuals?: string; message?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const { jobId } = await params;
  const query = await searchParams;
  const record = await getTenantJobRecord(session.tenantId, jobId);

  if (!record) {
    notFound();
  }

  const { job, otherCustomerInvoices, jobCommunications, customerCommunications, feedback } = record;
  const linkedInvoice = job.invoice ?? null;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Jobs"
        title={job.summary}
        description="Who, when, how long, what was billed, and what was communicated — all in one place."
        section="jobs"
        actions={(
          <>
            <CustomerLink customerId={job.customerId} className="ghost">Open customer</CustomerLink>
            {linkedInvoice ? <Link className="ghost" href={getInvoiceRecordHref(linkedInvoice.id)}>Open linked invoice</Link> : null}
          </>
        )}
      />

      {query.scheduled === "1" ? (
        <div className="surface surface-alert is-success">
          <p>Job timing updated.</p>
        </div>
      ) : null}
      {query.actuals === "1" ? (
        <div className="surface surface-alert is-success">
          <p>Actual hours saved.</p>
        </div>
      ) : null}
      {query.message === "sent" ? (
        <div className="surface surface-alert is-success">
          <p>Message sent and linked to this job.</p>
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
            <div className="setup-summary-value" style={{ textTransform: "capitalize" }}>{job.status.replace(/_/g, " ")}</div>
            <p className="setup-summary-copy">Current state of the job in the workflow.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Scheduled</div>
            <div className="setup-summary-value" style={{ fontSize: "1.5rem", lineHeight: 1.15 }}>
              {job.scheduledFor ? new Date(job.scheduledFor).toLocaleDateString() : "TBD"}
            </div>
            <p className="setup-summary-copy">{job.scheduledFor ? new Date(job.scheduledFor).toLocaleTimeString() : "No date set yet."}</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Hours</div>
            <div className="setup-summary-value" style={{ fontSize: "1.5rem", lineHeight: 1.15 }}>
              Est {job.estimatedHours ?? "—"}
            </div>
            <p className="setup-summary-copy">Actual {job.actualHours ?? "—"} hours recorded so far.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Job details</div>
            <h2 style={{ marginBottom: 8 }}>Operational basics</h2>
            <p>Customer, location, and any risk flags for this job.</p>
          </div>

          <div className="setup-list">
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Customer</span>
                </div>
                <p>
                  <CustomerLink customerId={job.customerId} className="inline-entity-link">
                    {job.customer.firstName} {job.customer.lastName}
                  </CustomerLink>
                </p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Address</span>
                </div>
                <p>{job.address ?? job.customer.address ?? "Not set"}</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Suburb</span>
                </div>
                <p>{job.suburb ?? job.customer.suburb ?? "Not set"}</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${job.weatherRisk ? "is-warning" : "is-off"}`}>Weather</span>
                </div>
                <p>{job.weatherRisk ? "Weather risk is flagged for this job." : "No weather risk is currently flagged."}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Timing</div>
            <h2 style={{ marginBottom: 8 }}>Schedule and actuals</h2>
            <p>Update the scheduled time or log actual hours once the work is done.</p>
          </div>

          <form action={`/api/tenant/jobs/${job.id}/schedule`} method="post" className="form-grid">
            <input type="hidden" name="returnTo" value={`/dashboard/jobs/${job.id}`} />
            <label className="label">
              Scheduled for
              <input
                className="input"
                name="scheduledFor"
                type="datetime-local"
                defaultValue={job.scheduledFor ? new Date(job.scheduledFor).toISOString().slice(0, 16) : ""}
                required
              />
            </label>
            <button className="ghost" type="submit">Save schedule</button>
          </form>

          <form action={`/api/tenant/jobs/${job.id}/actuals`} method="post" className="form-grid">
            <input type="hidden" name="returnTo" value={`/dashboard/jobs/${job.id}`} />
            <label className="label">
              Actual hours
              <input className="input" name="actualHours" type="number" min="0" step="0.25" defaultValue={job.actualHours ?? ""} required />
            </label>
            <button className="ghost" type="submit">Save actuals</button>
          </form>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Billing trail</div>
            <h2>Billing</h2>
            <p>Invoice linked to this job, or create one if the work is complete.</p>
          </div>
        </div>

        <div className="setup-list">
          {linkedInvoice ? (
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-on">Linked invoice</span>
                  <span>{linkedInvoice.status}</span>
                </div>
                <h3>
                  <Link className="inline-entity-link" href={getInvoiceRecordHref(linkedInvoice.id)}>
                    {linkedInvoice.number}
                  </Link>
                </h3>
                <p>${linkedInvoice.amount}</p>
              </div>
            </div>
          ) : (
            <p className="setup-note">No invoice linked from this job yet.</p>
          )}

          {job.status === "complete" && !linkedInvoice ? (
            <form action="/api/tenant/invoices/create" method="post" className="setup-scenario-row">
              <input type="hidden" name="customerId" value={job.customerId} />
              <input type="hidden" name="jobId" value={job.id} />
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-warning">Ready to invoice</span>
                </div>
                <h3>Create a linked invoice</h3>
                <p>Completed work should naturally roll into billing from here.</p>
              </div>
              <div className="setup-scenario-input">
                <label htmlFor="invoice-amount">Invoice amount</label>
                <input id="invoice-amount" className="input" name="amount" type="number" min="1" step="0.01" defaultValue={job.estimatedHours ? Number(job.estimatedHours * 65).toFixed(2) : "95"} required />
                <label htmlFor="invoice-note">Internal note</label>
                <input id="invoice-note" className="input" name="note" defaultValue={`Invoice for ${job.summary}`} />
                <button className="cta" type="submit">Create linked invoice</button>
              </div>
            </form>
          ) : null}

          {otherCustomerInvoices.slice(0, 4).map((invoice) => (
            <div key={invoice.id} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Customer invoice</span>
                  <span>{invoice.status}</span>
                </div>
                <h3>
                  <Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>
                    {invoice.number}
                  </Link>
                </h3>
                <p>${invoice.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cards-2">
        <ManualCommunicationForm
          customerId={job.customerId}
          jobId={job.id}
          returnTo={`/dashboard/jobs/${job.id}`}
          title="Send customer update"
        />

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Job communication</div>
            <h2 style={{ marginBottom: 8 }}>Messages linked directly to this job</h2>
            <p>Messages sent specifically about this job.</p>
          </div>

          <div className="setup-list">
            {jobCommunications.length > 0 ? jobCommunications.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="setup-note">No job-linked communication recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
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

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Feedback</div>
            <h2 style={{ marginBottom: 8 }}>Recent sentiment</h2>
            <p>Post-job rating and comments from this customer.</p>
          </div>

          <div className="setup-list">
            {feedback.length > 0 ? feedback.map((entry) => (
              <div key={entry.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            )) : <p className="setup-note">No feedback has been recorded for this job or customer yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
