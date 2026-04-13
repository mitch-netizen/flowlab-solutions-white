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

export default async function DashboardPage() {
  const session = await requireTenantSession();
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
        eyebrow="Workspace"
        title={`Hi ${headingName}, here’s the brief.`}
        description={`This week you've had ${enquiriesThisWeek} new enquir${enquiriesThisWeek === 1 ? "y" : "ies"} and ${bookedJobsThisWeek} job${bookedJobsThisWeek === 1 ? "" : "s"} booked. Tomorrow ${tomorrowJobs.length === 0 ? "is clear so far." : `has ${tomorrowJobs.length} job${tomorrowJobs.length === 1 ? "" : "s"} in the run sheet.`}`}
        section="workspace"
        actions={(
          <>
            <Link className="ghost" href="/dashboard/scheduler">Open tomorrow&apos;s schedule</Link>
            <Link className="ghost" href="/dashboard/system-health">Review automations</Link>
          </>
        )}
      />

      <div className="cards-3">
        <div className="surface-soft">
          <strong>New enquiries this week</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{enquiriesThisWeek}</div>
          <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 13 }}>Fresh demand coming through the public form.</div>
        </div>
        <div className="surface-soft">
          <strong>Jobs booked this week</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{bookedJobsThisWeek}</div>
          <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 13 }}>Scheduled, in progress, complete, invoiced, or paid.</div>
        </div>
        <div className="surface-soft">
          <strong>Tomorrow&apos;s run sheet</strong>
          <div style={{ fontSize: 34, marginTop: 10 }}>{tomorrowJobs.length}</div>
          <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 13 }}>
            {tomorrowJobs.length === 0 ? "No jobs scheduled yet." : "Ready to review before the day starts."}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Tomorrow</h2>
            <Link href="/dashboard/scheduler" className="inline-entity-link">Open scheduler</Link>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {tomorrowJobs.length > 0 ? tomorrowJobs.map((job) => (
              <div key={job.id} className="surface-soft">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <Link className="inline-entity-link" href={getJobPrimaryHref(job)}>{job.summary}</Link>
                    <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                      <CustomerLink customerId={job.customer.id} className="inline-entity-link">
                        {job.customer.firstName} {job.customer.lastName}
                      </CustomerLink>
                      {" "}· {job.suburb ?? job.customer.suburb ?? "Suburb not set"}
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    {job.scheduledFor ? new Date(job.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD"}
                  </div>
                </div>
              </div>
            )) : <div className="surface-soft">Tomorrow is still open. Head into the scheduler if you want to build the run sheet now.</div>}
          </div>
        </div>

        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Needs your eyes</h2>
            <Link href="/dashboard/system-health" className="inline-entity-link">Review issues</Link>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {attentionItems.length > 0 ? attentionItems.map((item) => (
              <Link key={item.title} href={item.href} className="surface-soft">
                <strong>{item.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{item.detail}</div>
              </Link>
            )) : <div className="surface-soft">Nothing urgent right now. FlowLab is clear on overdue invoices, failed jobs, and integration alerts.</div>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Top customers</h2>
            <Link href="/dashboard/crm" className="inline-entity-link">Open CRM</Link>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {topCustomerRows.map((customer) => (
              <div key={customer.id} className="surface-soft">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <CustomerLink customerId={customer.id} className="inline-entity-link">
                      {customer.firstName} {customer.lastName}
                    </CustomerLink>
                    <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                      {customer.suburb ?? "Suburb not set"} · Rating {customer.ratingAverage?.toFixed(1) ?? "—"}
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "right" }}>
                    <div>{customer._count.jobs} jobs</div>
                    <div>{customer._count.invoices} invoices</div>
                    <div>{customer._count.quotes} quotes</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>FlowLab handled this</h2>
            <Link href="/dashboard/system-health" className="inline-entity-link">Open event trail</Link>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {automationWins.length > 0 ? automationWins.map((item) => (
              <Link key={item.id} href={item.href} className="surface-soft">
                <strong>{item.title}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>{item.detail}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </Link>
            )) : <div className="surface-soft">Automated wins will show up here as FlowLab sends, records, and follows up on behalf of the business.</div>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Recent jobs</h2>
            <Link href="/dashboard/scheduler" className="inline-entity-link">Open jobs</Link>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
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

        <div className="surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Recent invoices</h2>
            <Link href="/dashboard/invoices" className="inline-entity-link">Open billing</Link>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
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
