import Link from "next/link";

import { getJobBoard, getTenantCustomers } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
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

const statusBgClass: Record<string, string> = {
  quoted: "bg-slate-500",
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  complete: "bg-green-500",
  invoiced: "bg-violet-500",
  paid: "bg-emerald-500"
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
    
      <DashboardPageScaffold
        eyebrow="Jobs"
        title="Job board"
        description="Track work from quoted through to paid. Each card shows the next action so nothing slips between stages."
        section="jobs"
        actions={
          <>
            <Link href="/dashboard/scheduler" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open scheduler</Link>
            <Link href="/dashboard/quotes" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">New quote</Link>
          </>
        }
      >

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">All jobs</div>
            <div className="text-3xl font-semibold">{totalJobs}</div>
            <p className="text-sm text-muted-foreground">All stages — quoted through to paid.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Active now</div>
            <div className="text-3xl font-semibold">{activeJobs}</div>
            <p className="text-sm text-muted-foreground">Scheduled or currently in progress.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Awaiting invoice</div>
            <div className="text-3xl font-semibold">{awaitingInvoice}</div>
            <p className="text-sm text-muted-foreground">{quotedJobs} more quoted job{quotedJobs === 1 ? "" : "s"} are still waiting to be booked.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/jobs/create" method="post">
          <div className="space-y-2">
            <div className="eyebrow">Create job</div>
            <h2>Add work straight into the board</h2>
            <p>Add work directly to the board. You can schedule it now or leave it as a quote to confirm later.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Customer
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerId" required defaultValue="">
              <option value="" disabled>Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Job summary
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="summary" placeholder="Describe the work to be done." required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Scheduled for
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="scheduledFor" type="datetime-local" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Estimated hours
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="estimatedHours" type="number" min="0.5" step="0.5" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Address
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="address" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Suburb
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="suburb" />
          </label>
          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Create job</button>
        </form>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">How the board works</div>
            <h2>Status guide</h2>
            <p>Each lane represents a stage in the job lifecycle. Move jobs forward as work progresses.</p>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Quoted</span>
                </div>
                <h3>Quoted — not yet booked</h3>
                <p>Move to Scheduled once the customer confirms, or leave parked until they do.</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-on">Scheduled / in progress</span>
                </div>
                <h3>Scheduled &amp; in progress</h3>
                <p>Open the job to update timing, log hours, or send a customer message.</p>
              </div>
            </div>
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill border-l-amber-500">Complete</span>
                </div>
                <h3>Completion should naturally lead to billing</h3>
                <p>Completed jobs with no invoice should be obvious so cashflow doesn’t stall at the handoff.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
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
                    className={`job-board-lane-badge ${statusBgClass[status] ?? "bg-slate-500"}`}
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
                            <span className="opacity-60">({job.invoice.status})</span>
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
    </DashboardPageScaffold>
  );
}
