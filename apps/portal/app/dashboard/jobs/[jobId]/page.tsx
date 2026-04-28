import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantJobRecord } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageScaffold from "../../../../components/dashboard/page-scaffold";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
import { getInvoiceRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function JobRecordPage({
  params,
  searchParams
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ scheduled?: string; actuals?: string; message?: string; error?: string; on_my_way?: string }>;
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
    
      <DashboardPageScaffold
        eyebrow="Jobs"
        title={job.summary}
        description="Who, when, how long, what was billed, and what was communicated — all in one place."
        section="jobs"
        actions={(
          <>
            <CustomerLink customerId={job.customerId} className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open customer</CustomerLink>
            {linkedInvoice ? <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={getInvoiceRecordHref(linkedInvoice.id)}>Open linked invoice</Link> : null}
            {job.status === "in_progress" ? (
              <form action={`/api/tenant/jobs/${job.id}/on-my-way`} method="post">
                <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                  On my way →
                </button>
              </form>
            ) : null}
          </>
        )}
      >

      {query.scheduled === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Job timing updated.</p>
        </div>
      ) : null}
      {query.actuals === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Actual hours saved.</p>
        </div>
      ) : null}
      {query.on_my_way === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>ETA SMS sent to the customer.</p>
        </div>
      ) : null}
      {query.message === "sent" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Message sent and linked to this job.</p>
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
            <div className="text-3xl font-semibold capitalize">{job.status.replace(/_/g, " ")}</div>
            <p className="text-sm text-muted-foreground">Current state of the job in the workflow.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Scheduled</div>
            <div className="text-2xl font-semibold leading-tight">
              {job.scheduledFor ? new Date(job.scheduledFor).toLocaleDateString() : "TBD"}
            </div>
            <p className="text-sm text-muted-foreground">{job.scheduledFor ? new Date(job.scheduledFor).toLocaleTimeString() : "No date set yet."}</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Hours</div>
            <div className="text-2xl font-semibold leading-tight">
              Est {job.estimatedHours ?? "—"}
            </div>
            <p className="text-sm text-muted-foreground">Actual {job.actualHours ?? "—"} hours recorded so far.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Job details</div>
            <h2>Operational basics</h2>
            <p>Customer, location, and any risk flags for this job.</p>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Customer</span>
                </div>
                <p>
                  <CustomerLink customerId={job.customerId} className="inline-entity-link">
                    {job.customer.firstName} {job.customer.lastName}
                  </CustomerLink>
                </p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Address</span>
                </div>
                <p>{job.address ?? job.customer.address ?? "Not set"}</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Suburb</span>
                </div>
                <p>{job.suburb ?? job.customer.suburb ?? "Not set"}</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${job.weatherRisk ? "is-warning" : "is-off"}`}>Weather</span>
                </div>
                <p>{job.weatherRisk ? "Weather risk is flagged for this job." : "No weather risk is currently flagged."}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Timing</div>
            <h2>Schedule and actuals</h2>
            <p>Update the scheduled time or log actual hours once the work is done.</p>
          </div>

          <form action={`/api/tenant/jobs/${job.id}/schedule`} method="post" className="space-y-4">
            <input type="hidden" name="returnTo" value={`/dashboard/jobs/${job.id}`} />
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Scheduled for
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                name="scheduledFor"
                type="datetime-local"
                defaultValue={job.scheduledFor ? new Date(job.scheduledFor).toISOString().slice(0, 16) : ""}
                required
              />
            </label>
            <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Save schedule</button>
          </form>

          <form action={`/api/tenant/jobs/${job.id}/actuals`} method="post" className="space-y-4">
            <input type="hidden" name="returnTo" value={`/dashboard/jobs/${job.id}`} />
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Actual hours
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="actualHours" type="number" min="0" step="0.25" defaultValue={job.actualHours ?? ""} required />
            </label>
            <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Save actuals</button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Billing trail</div>
            <h2>Billing</h2>
            <p>Invoice linked to this job, or create one if the work is complete.</p>
          </div>
        </div>

        <div className="space-y-3">
          {linkedInvoice ? (
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">No invoice linked from this job yet.</p>
          )}

          {job.status === "complete" && !linkedInvoice ? (
            <form action="/api/tenant/invoices/create" method="post" className="grid gap-4 rounded-lg border bg-card/40 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
              <input type="hidden" name="customerId" value={job.customerId} />
              <input type="hidden" name="jobId" value={job.id} />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill border-l-amber-500">Ready to invoice</span>
                </div>
                <h3>Create a linked invoice</h3>
                <p>Completed work should naturally roll into billing from here.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="invoice-amount">Invoice amount</label>
                <input id="invoice-amount" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="amount" type="number" min="1" step="0.01" defaultValue={job.estimatedHours ? Number(job.estimatedHours * 65).toFixed(2) : "95"} required />
                <label htmlFor="invoice-note">Internal note</label>
                <input id="invoice-note" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="note" defaultValue={`Invoice for ${job.summary}`} />
                <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Create linked invoice</button>
              </div>
            </form>
          ) : null}

          {otherCustomerInvoices.slice(0, 4).map((invoice) => (
            <div key={invoice.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Job communication</div>
            <h2>Messages linked directly to this job</h2>
            <p>Messages sent specifically about this job.</p>
          </div>

          <div className="space-y-3">
            {jobCommunications.length > 0 ? jobCommunications.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No job-linked communication recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
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

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Feedback</div>
            <h2>Recent sentiment</h2>
            <p>Post-job rating and comments from this customer.</p>
          </div>

          <div className="space-y-3">
            {feedback.length > 0 ? feedback.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No feedback has been recorded for this job or customer yet.</p>}
          </div>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
