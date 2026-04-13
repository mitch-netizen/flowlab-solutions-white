import Link from "next/link";

import { getJobBoard } from "@flowlab/db";

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
  const { jobs, grouped, statuses } = await getJobBoard(session.tenantId);

  const totalJobs = jobs.length;
  const activeJobs = grouped.scheduled.length + grouped.in_progress.length;
  const awaitingInvoice = grouped.complete.length;
  const revenue = [...grouped.invoiced, ...grouped.paid].reduce(
    (sum, j) => sum + (j.invoice?.status === "paid" ? 0 : 0),
    0
  );

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Jobs"
        title="Job board"
        description="Every job across all statuses. Click a job to open the full card, or click the customer name to open their CRM record."
        section="jobs"
        meta={`${totalJobs} total · ${activeJobs} active · ${awaitingInvoice} awaiting invoice`}
        actions={
          <Link href="/dashboard/quotes" className="cta" style={{ fontSize: 14, padding: "8px 18px" }}>
            New quote
          </Link>
        }
      />

      {/* Status swim lanes */}
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
  );
}
