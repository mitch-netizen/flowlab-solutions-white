import Link from "next/link";

import { getTenantDashboardSnapshot, prisma } from "@flowlab/db";
import { buildTenantUrl } from "@flowlab/contracts/server";
import { Badge, formatDateTime, formatTime } from "@flowlab/ui";

import CustomerLink from "../../components/customer-link";
import DashboardPageScaffold from "../../components/dashboard/page-scaffold";
import { InvoicesTable, JobsTable } from "./dashboard-tables";
import DashboardEmptyStateActions from "./DashboardEmptyStateActions";
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

function isSettingsLogEvent(event: { triggeredBy: string | null; requestSummary: string | null; responseSummary: string | null }) {
  const triggeredBy = event.triggeredBy?.toLowerCase() ?? "";
  const requestSummary = event.requestSummary?.toLowerCase() ?? "";
  const responseSummary = event.responseSummary?.toLowerCase() ?? "";
  return triggeredBy.includes("settings") || requestSummary.includes("settings") || responseSummary.includes("settings");
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
    .filter((event) => event.status === "success" && event.triggeredBy !== "seed" && !isSettingsLogEvent(event))
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


  const tenantSlug = snapshot.tenant?.slug ?? "";
  const bookingLink =
    tenantSlug.length > 0
      ? process.env.NODE_ENV === "development"
        ? `http://${tenantSlug}.localhost:3001/enquiry`
        : buildTenantUrl(tenantSlug, "/enquiry")
      : null;

  const isNewTenantEmptyState =
    snapshot.jobs.length === 0 &&
    snapshot.invoices.length === 0 &&
    enquiriesThisWeek === 0 &&
    bookedJobsThisWeek === 0 &&
    topCustomerRows.length === 0 &&
    attentionItems.length === 0 &&
    automationWins.length === 0 &&
    tomorrowJobs.length === 0;

  const headingName =
    currentUser?.firstName?.trim() ||
    snapshot.tenant?.profile?.businessName ||
    "there";

  return (
    
      <DashboardPageScaffold
        eyebrow="Overview"
        title={`Hi ${headingName}, here’s the brief.`}
        description={`This week you've had ${enquiriesThisWeek} new enquir${enquiriesThisWeek === 1 ? "y" : "ies"} and ${bookedJobsThisWeek} job${bookedJobsThisWeek === 1 ? "" : "s"} booked. Tomorrow ${tomorrowJobs.length === 0 ? "is clear so far." : `has ${tomorrowJobs.length} job${tomorrowJobs.length === 1 ? "" : "s"} in the run sheet.`}`}
        section="home"
        actions={(
          <>
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/scheduler">Open tomorrow&apos;s schedule</Link>
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/system-health">Review automations</Link>
            <form action="/api/tenant/digest" method="post" style={{ display: "inline" }}>
              <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Send me today&apos;s brief</button>
            </form>
          </>
        )}
      >

      {query.digest === "sent" && (
        <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#86efac" }}>
          Brief sent — check your SMS and email.
        </div>
      )}

      {query.error === "digest_failed" && (
        <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#fca5a5" }}>
          Brief could not be sent. Check that your SMS and email integrations are connected in Setup.
        </div>
      )}

      {isNewTenantEmptyState ? (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Next step</div>
            <h2 style={{ margin: 0 }}>Create your first quote</h2>
            <p className="text-sm text-muted-foreground">You’re set up. Let’s get your first quote out.</p>
          </div>
          <DashboardEmptyStateActions bookingLink={bookingLink} />
        </div>
      ) : null}

      {!isNewTenantEmptyState && (
      <>
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">New enquiries this week</div>
            <div className="text-3xl font-semibold">{enquiriesThisWeek}</div>
            <p className="text-sm text-muted-foreground">Submitted via your public enquiry form.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Jobs booked this week</div>
            <div className="text-3xl font-semibold">{bookedJobsThisWeek}</div>
            <p className="text-sm text-muted-foreground">In any active or completed stage.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Tomorrow&apos;s run sheet</div>
            <div className="text-3xl font-semibold">{tomorrowJobs.length}</div>
            <p className="text-sm text-muted-foreground">
              {tomorrowJobs.length === 0 ? "No jobs scheduled yet." : "Ready to review before the day starts."}
            </p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Tomorrow</div>
              <h2>Run sheet</h2>
              <p>Jobs scheduled for tomorrow, in order.</p>
            </div>
            <Link href="/dashboard/scheduler" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open scheduler</Link>
          </div>

          <div className="space-y-3">
            {tomorrowJobs.length > 0 ? tomorrowJobs.map((job) => (
              <div key={job.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span>{job.scheduledFor ? formatTime(job.scheduledFor) : "TBD"}</span>
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
            )) : <p className="text-sm text-muted-foreground">Tomorrow is still open. Head into the scheduler if you want to build the run sheet now.</p>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Action required</div>
              <h2>Needs attention</h2>
              <p>Overdue invoices, failed automations, and expiring integrations in one place.</p>
            </div>
            <Link href="/dashboard/system-health" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">View all</Link>
          </div>

          <div className="space-y-3">
            {attentionItems.length > 0 ? attentionItems.map((item) => (
              <div key={item.title} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <Badge tone="warning">Attention</Badge>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={item.href}>Open</Link>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">All clear — no overdue invoices, failed automations, or integration alerts right now.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Top customers</div>
              <h2>Most active clients</h2>
              <p>Your highest-volume customers by jobs, invoices, and quotes.</p>
            </div>
            <Link href="/dashboard/crm" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open CRM</Link>
          </div>

          <div className="space-y-3">
            {topCustomerRows.map((customer) => (
              <div key={customer.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <h3>
                    <CustomerLink customerId={customer.id} className="inline-entity-link">
                      {customer.firstName} {customer.lastName}
                    </CustomerLink>
                  </h3>
                  <p>{customer.suburb ?? "Suburb not set"} · Rating {customer.ratingAverage?.toFixed(1) ?? "—"}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2" style={{ color: "#94a3b8", fontSize: 13 }}>
                  <span>{customer._count.jobs} jobs</span>
                  <span>{customer._count.invoices} invoices</span>
                  <span>{customer._count.quotes} quotes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Running in the background</div>
              <h2>Recent automations</h2>
              <p>The latest actions your automations have handled on your behalf.</p>
            </div>
            <Link href="/dashboard/system-health" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open event trail</Link>
          </div>

          <div className="space-y-3">
            {automationWins.length > 0 ? automationWins.map((item) => (
              <div key={item.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <Badge tone="success">Success</Badge>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={item.href}>Open</Link>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Automation activity will appear here once your workflows start firing.</p>}
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Recent jobs</div>
              <h2>Latest work created</h2>
            </div>
            <Link href="/dashboard/scheduler" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open jobs</Link>
          </div>

          <JobsTable jobs={snapshot.jobs} />
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Recent invoices</div>
              <h2>Latest billing activity</h2>
            </div>
            <Link href="/dashboard/invoices" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold">Open billing</Link>
          </div>

          <InvoicesTable invoices={snapshot.invoices} />
        </div>
      </div>
      </>
      )}
    </DashboardPageScaffold>
  );
}
