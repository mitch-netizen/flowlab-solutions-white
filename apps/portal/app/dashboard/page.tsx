import Link from "next/link";

import { getTenantDashboardSnapshot, prisma } from "@flowlab/db";

import CustomerLink from "../../components/customer-link";
import DashboardPageHeader from "../../components/dashboard-page-header";
import { getCustomerRecordHref, getInvoiceRecordHref, getJobPrimaryHref, getJobRecordHref } from "../../lib/dashboard-links";
import { requireTenantSession } from "../../lib/session";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function endOfTomorrow() {
  const date = startOfTomorrow();
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

function getAutomationHeadline(triggeredBy: string | null | undefined, requestSummary: string | null | undefined, responseSummary: string | null | undefined) {
  switch (triggeredBy) {
    case "public_quote_acceptance":
      return "Quote accepted and agreement prepared";
    case "agreement_dispatch":
      return "Agreement dispatch handled";
    case "public_signature_completion":
      return "Signed agreement recorded";
    case "public_invoice_payment":
      return "Payment captured and recorded";
    case "public_feedback_form":
      return "Customer feedback logged";
    case "tenant_invoice_creator":
      return "Invoice created and sent";
    case "mobile_sync":
      return "Field updates synced back into FlowLab";
    default:
      return responseSummary ?? requestSummary ?? "Automation completed";
  }
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ digest?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const weekStart = startOfWeek();
  const tomorrowStart = startOfTomorrow();
  const tomorrowEnd = endOfTomorrow();

  const [snapshot, enquiriesThisWeek, bookedJobsThisWeek, tomorrowJobs, topCustomers] = await Promise.all([
    getTenantDashboardSnapshot(session.tenantId),
    prisma.platformEventLog.count({
      where: {
        tenantId: session.tenantId,
        triggeredBy: "public_enquiry_form",
        createdAt: { gte: weekStart }
      }
    }),
    prisma.job.count({
      where: {
        tenantId: session.tenantId,
        status: { in: ["scheduled", "in_progress", "complete", "invoiced", "paid"] },
        createdAt: { gte: weekStart }
      }
    }),
    prisma.job.findMany({
      where: {
        tenantId: session.tenantId,
        scheduledFor: {
          gte: tomorrowStart,
          lt: tomorrowEnd
        }
      },
      include: {
        customer: true,
        invoice: {
          select: { id: true }
        }
      },
      orderBy: { scheduledFor: "asc" },
      take: 8
    }),
    prisma.customer.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        suburb: true,
        ratingAverage: true,
        _count: {
          select: {
            jobs: true,
            quotes: true,
            invoices: true
          }
        }
      },
      take: 12
    })
  ]);

  const currentUser = snapshot.tenant?.users.find((user) => user.id === session.sub) ?? snapshot.tenant?.users[0] ?? null;
  const topCustomerRows = [...topCustomers]
    .sort((a, b) => {
      const scoreA = a._count.jobs * 3 + a._count.invoices * 2 + a._count.quotes;
      const scoreB = b._count.jobs * 3 + b._count.invoices * 2 + b._count.quotes;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const overdueInvoices = snapshot.invoices.filter((invoice) => invoice.dueAt && invoice.dueAt < new Date() && invoice.status !== "paid");
  const quotesNeedingFollowUp = snapshot.jobs.filter((job) => job.status === "quoted");
  const integrationAlerts = snapshot.integrations.filter((integration) => {
    if (integration.status === "error") {
      return true;
    }

    if (!integration.oauthExpiresAt) {
      return false;
    }

    return new Date(integration.oauthExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  });

  const attentionItems = [
    overdueInvoices.length > 0
      ? {
          title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} waiting for follow-up`,
          detail: "Open billing and chase the oldest balance first.",
          href: getInvoiceRecordHref(overdueInvoices[0]!.id)
        }
      : null,
    snapshot.automationHealth.failed > 0
      ? {
          title: `${snapshot.automationHealth.failed} automation job${snapshot.automationHealth.failed === 1 ? "" : "s"} failed`,
          detail: "Review and retry the failures before they snowball.",
          href: "/dashboard/system-health"
        }
      : null,
    integrationAlerts.length > 0
      ? {
          title: `${integrationAlerts.length} integration connection${integrationAlerts.length === 1 ? "" : "s"} need attention`,
          detail: "Reconnect expiring or failed services from the integrations hub.",
          href: "/dashboard/integrations"
        }
      : null,
    quotesNeedingFollowUp.length > 0
      ? {
          title: `${quotesNeedingFollowUp.length} quoted job${quotesNeedingFollowUp.length === 1 ? "" : "s"} still need booking`,
          detail: "Review the quoted jobs and move the next ones into the schedule.",
          href: getJobRecordHref(quotesNeedingFollowUp[0]!.id)
        }
      : null
  ].filter(Boolean) as Array<{ title: string; detail: string; href: string }>;

  const automationWins = snapshot.events
    .filter((event) => event.status === "success" && event.triggeredBy !== "seed")
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: getAutomationHeadline(event.triggeredBy, event.requestSummary, event.responseSummary),
      detail: event.responseSummary ?? event.requestSummary ?? "Completed successfully",
      href: event.jobId
        ? getJobRecordHref(event.jobId)
        : event.customerId
          ? getCustomerRecordHref(event.customerId)
          : "/dashboard/system-health",
      createdAt: event.createdAt
    }));

  const headingName =
    currentUser?.firstName?.trim() ||
    snapshot.tenant?.profile?.businessName ||
    "there";

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Overview"
        title={`Hi ${headingName}, here’s the brief.`}
        description={`This week you've had ${enquiriesThisWeek} new enquir${enquiriesThisWeek === 1 ? "y" : "ies"} and ${bookedJobsThisWeek} job${bookedJobsThisWeek === 1 ? "" : "s"} booked. Tomorrow ${tomorrowJobs.length === 0 ? "is clear so far." : `has ${tomorrowJobs.length} job${tomorrowJobs.length === 1 ? "" : "s"} in the run sheet.`}`}
        section="home"
        actions={(
          <>
            <Link className="ghost" href="/dashboard/scheduler">Open tomorrow&apos;s schedule</Link>
            <Link className="ghost" href="/dashboard/system-health">Review automations</Link>
            <form action="/api/tenant/digest" method="post" style={{ display: "inline" }}>
              <button className="ghost" type="submit">Send me today&apos;s brief</button>
            </form>
          </>
        )}
      />

      {query.digest === "sent" && (
        <div className="surface-soft" style={{ color: "#86efac" }}>
          Brief sent — check your SMS and email.
        </div>
      )}

      {query.error === "digest_failed" && (
        <div className="surface-soft" style={{ color: "#fca5a5" }}>
          Brief could not be sent. Check that your SMS and email integrations are connected in Setup.
        </div>
      )}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">New enquiries this week</div>
            <div className="setup-summary-value">{enquiriesThisWeek}</div>
            <p className="setup-summary-copy">Fresh demand coming through the public form.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Jobs booked this week</div>
            <div className="setup-summary-value">{bookedJobsThisWeek}</div>
            <p className="setup-summary-copy">Scheduled, in progress, complete, invoiced, or paid.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Tomorrow&apos;s run sheet</div>
            <div className="setup-summary-value">{tomorrowJobs.length}</div>
            <p className="setup-summary-copy">
              {tomorrowJobs.length === 0 ? "No jobs scheduled yet." : "Ready to review before the day starts."}
            </p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Tomorrow</div>
              <h2>Run sheet preview</h2>
              <p>The next day should be the first thing the operator can scan, without opening a second screen.</p>
            </div>
            <Link href="/dashboard/scheduler" className="ghost">Open scheduler</Link>
          </div>

          <div className="setup-list">
            {tomorrowJobs.length > 0 ? tomorrowJobs.map((job) => (
              <div key={job.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD"}</span>
                    <span>{job.suburb ?? job.customer.suburb ?? "Suburb not set"}</span>
                  </div>
                  <h3>
                    <Link className="inline-entity-link" href={getJobPrimaryHref(job)}>{job.summary}</Link>
                  </h3>
                  <p>
                    <CustomerLink customerId={job.customer.id} className="inline-entity-link">
                      {job.customer.firstName} {job.customer.lastName}
                    </CustomerLink>
                  </p>
                </div>
              </div>
            )) : <p className="setup-note">Tomorrow is still open. Head into the scheduler if you want to build the run sheet now.</p>}
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Needs your eyes</div>
              <h2>Attention queue</h2>
              <p>Keep the highest-friction items together so the operator does not have to infer what matters most.</p>
            </div>
            <Link href="/dashboard/system-health" className="ghost">Review issues</Link>
          </div>

          <div className="setup-list">
            {attentionItems.length > 0 ? attentionItems.map((item) => (
              <div key={item.title} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-warning">Attention</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <div className="setup-row-actions">
                  <Link className="ghost" href={item.href}>Open</Link>
                </div>
              </div>
            )) : <p className="setup-note">Nothing urgent right now. FlowLab is clear on overdue invoices, failed jobs, and integration alerts.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Top customers</div>
              <h2>Relationship depth</h2>
              <p>Keep the strongest customer records close to the overview so repeat work and risk stay visible.</p>
            </div>
            <Link href="/dashboard/crm" className="ghost">Open CRM</Link>
          </div>

          <div className="setup-list">
            {topCustomerRows.map((customer) => (
              <div key={customer.id} className="setup-row">
                <div className="setup-row-main">
                  <h3>
                    <CustomerLink customerId={customer.id} className="inline-entity-link">
                      {customer.firstName} {customer.lastName}
                    </CustomerLink>
                  </h3>
                  <p>{customer.suburb ?? "Suburb not set"} · Rating {customer.ratingAverage?.toFixed(1) ?? "—"}</p>
                </div>
                <div className="setup-row-actions" style={{ color: "#94a3b8", fontSize: 13 }}>
                  <span>{customer._count.jobs} jobs</span>
                  <span>{customer._count.invoices} invoices</span>
                  <span>{customer._count.quotes} quotes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">FlowLab handled this</div>
              <h2>Recent automated wins</h2>
              <p>Make the system’s recent work visible so the operator trusts that things are still moving in the background.</p>
            </div>
            <Link href="/dashboard/system-health" className="ghost">Open event trail</Link>
          </div>

          <div className="setup-list">
            {automationWins.length > 0 ? automationWins.map((item) => (
              <div key={item.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-on">Success</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <div className="setup-row-actions">
                  <Link className="ghost" href={item.href}>Open</Link>
                </div>
              </div>
            )) : <p className="setup-note">Automated wins will show up here as FlowLab sends, records, and follows up on behalf of the business.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Recent jobs</div>
              <h2>Latest work created</h2>
            </div>
            <Link href="/dashboard/scheduler" className="ghost">Open jobs</Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.jobs.map((job) => (
                <tr key={job.id}>
                  <td><Link className="inline-entity-link" href={getJobPrimaryHref(job)}>{job.summary}</Link></td>
                  <td>
                    <CustomerLink customerId={job.customerId} className="inline-entity-link">
                      {job.customer.firstName} {job.customer.lastName}
                    </CustomerLink>
                  </td>
                  <td>{job.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Recent invoices</div>
              <h2>Latest billing activity</h2>
            </div>
            <Link href="/dashboard/invoices" className="ghost">Open billing</Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></td>
                  <td>
                    <CustomerLink customerId={invoice.customerId} className="inline-entity-link">
                      {invoice.customer.firstName} {invoice.customer.lastName}
                    </CustomerLink>
                  </td>
                  <td>{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
