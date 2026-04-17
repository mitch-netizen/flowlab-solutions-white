import Link from "next/link";

import { getJobBoard, getTenantCustomers } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

const statusLabel: Record<string, string> = {
  quoted: "Quoted",
  scheduled: "Scheduled",
  in_progress: "In progress",
  complete: "Complete",
  invoiced: "Invoiced",
  paid: "Paid"
};

const statusColor: Record<string, string> = {
  quoted: "#64748b",
  scheduled: "#3b82f6",
  in_progress: "#f59e0b",
  complete: "#22c55e",
  invoiced: "#8b5cf6",
  paid: "#10b981"
};

export default async function JobBoardPage() {
  const session = await requireTenantSession();
  const [{ jobs, grouped, statuses }, customers] = await Promise.all([
    getJobBoard(session.tenantId),
    getTenantCustomers(session.tenantId)
  ]);

  const totalJobs = jobs.length;
  const activeJobs = grouped.scheduled.length + grouped.in_progress.length;
  const awaitingInvoice = grouped.complete.length;
  const quotedJobs = grouped.quoted.length;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Jobs"
        title="Job board"
        description="Track work from quoted through to paid. Each card shows the next action so nothing slips between stages."
        section="jobs"
        actions={
          <>
            <Link href="/dashboard/scheduler" className="ghost">Open scheduler</Link>
            <Link href="/dashboard/quotes" className="cta">New quote</Link>
          </>
        }
      />

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">All jobs</div>
            <div className="setup-summary-value">{totalJobs}</div>
            <p className="setup-summary-copy">All stages — quoted through to paid.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Active now</div>
            <div className="setup-summary-value">{activeJobs}</div>
            <p className="setup-summary-copy">Scheduled or currently in progress.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Awaiting invoice</div>
            <div className="setup-summary-value">{awaitingInvoice}</div>
            <p className="setup-summary-copy">{quotedJobs} more quoted job{quotedJobs === 1 ? "" : "s"} are still waiting to be booked.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/jobs/create" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Create job</div>
            <h2 style={{ marginBottom: 8 }}>Add work straight into the board</h2>
            <p>Add work directly to the board. You can schedule it now or leave it as a quote to confirm later.</p>
          </div>
          <label className="label">
            Customer
            <select className="select" name="customerId" required defaultValue="">
              <option value="" disabled>Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Job summary
            <input className="input" name="summary" placeholder="Describe the work to be done." required />
          </label>
          <label className="label">
            Scheduled for
            <input className="input" name="scheduledFor" type="datetime-local" />
          </label>
          <label className="label">
            Estimated hours
            <input className="input" name="estimatedHours" type="number" min="0.5" step="0.5" />
          </label>
          <label className="label">
            Address
            <input className="input" name="address" />
          </label>
          <label className="label">
            Suburb
            <input className="input" name="suburb" />
          </label>
          <button className="cta" type="submit">Create job</button>
        </form>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">How the board works</div>
            <h2 style={{ marginBottom: 8 }}>Status guide</h2>
            <p>Each lane represents a stage in the job lifecycle. Move jobs forward as work progresses.</p>
          </div>

          <div className="setup-list">
            <div className="setup-row" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Quoted</span>
                </div>
                <h3>Quoted — not yet booked</h3>
                <p>Move to Scheduled once the customer confirms, or leave parked until they do.</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-on">Scheduled / in progress</span>
                </div>
                <h3>Scheduled &amp; in progress</h3>
                <p>Open the job to update timing, log hours, or send a customer message.</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-warning">Complete</span>
                </div>
                <h3>Completion should naturally lead to billing</h3>
                <p>Completed jobs with no invoice should be obvious so cashflow doesn’t stall at the handoff.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Board view</div>
            <h2>All jobs</h2>
          </div>
        </div>

        <div className="job-board">
          {statuses.map((status) => {
            const cols = grouped[status];
            return (
              <div key={status} className="job-board-lane">
                <div className="job-board-lane-header">
                  <span
                    className="job-board-lane-badge"
                    style={{ background: statusColor[status] }}
                  />
                  <span className="job-board-lane-title">{statusLabel[status]}</span>
                  <span className="job-board-lane-count">{cols.length}</span>
                </div>

                <div className="job-board-cards">
                  {cols.length === 0 ? (
                    <div className="job-board-empty">No jobs here</div>
                  ) : (
                    cols.map((job) => (
                      <div key={job.id} className="job-board-card">
                        <Link href={getJobRecordHref(job.id)} className="job-board-card-title">
                          {job.summary}
                        </Link>
                        <div className="job-board-card-meta">
                          <CustomerLink customerId={job.customer.id} className="job-board-card-customer">
                            {job.customer.firstName} {job.customer.lastName}
                          </CustomerLink>
                          {job.suburb ? <span>{job.suburb}</span> : null}
                          {job.scheduledFor ? (
                            <span>
                              {new Date(job.scheduledFor).toLocaleDateString("en-AU", {
                                weekday: "short",
                                month: "short",
                                day: "numeric"
                              })}
                            </span>
                          ) : null}
                        </div>
                        {job.invoice ? (
                          <Link
                            href={getInvoiceRecordHref(job.invoice.id)}
                            className="job-board-card-invoice"
                          >
                            {job.invoice.xeroInvoiceId ? "Xero · " : ""}{job.invoice.number}
                            {" "}
                            <span style={{ opacity: 0.6 }}>({job.invoice.status})</span>
                          </Link>
                        ) : status === "complete" ? (
                          <Link
                            href={`/dashboard/invoices?jobId=${job.id}&customerId=${job.customerId}`}
                            className="job-board-card-action"
                          >
                            Create invoice →
                          </Link>
                        ) : status === "quoted" ? (
                          <form action={`/api/tenant/jobs/${job.id}/status`} method="post">
                            <input type="hidden" name="status" value="scheduled" />
                            <button className="job-board-card-action" type="submit">
                              Move to scheduled →
                            </button>
                          </form>
                        ) : status === "scheduled" ? (
                          <form action={`/api/tenant/jobs/${job.id}/status`} method="post">
                            <input type="hidden" name="status" value="in_progress" />
                            <button className="job-board-card-action" type="submit">
                              Start job →
                            </button>
                          </form>
                        ) : status === "in_progress" ? (
                          <form action={`/api/tenant/jobs/${job.id}/status`} method="post">
                            <input type="hidden" name="status" value="complete" />
                            <button className="job-board-card-action" type="submit">
                              Mark complete →
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
