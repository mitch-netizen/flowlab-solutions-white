import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerCrmRecord, prisma } from "@flowlab/db";

import CustomerLink from "../../../../components/customer-link";
import DashboardPageScaffold from "../../../../components/dashboard/page-scaffold";
import ManualCommunicationForm from "../../../../components/manual-communication-form";
import SubmitButton from "../../../../components/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { getInvoiceRecordHref, getJobRecordHref } from "../../../../lib/dashboard-links";
import { requireTenantSession } from "../../../../lib/session";

export default async function CustomerRecordPage({
  params,
  searchParams
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ updated?: string; message?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const { customerId } = await params;
  const query = await searchParams;
  const [record, tenantProfile] = await Promise.all([
    getCustomerCrmRecord(session.tenantId, customerId),
    prisma.tenantProfile.findUnique({ where: { tenantId: session.tenantId }, select: { emailSignatureAdHocDefault: true } })
  ]);

  if (!record) {
    notFound();
  }

  const { customer, communications, feedback, reminders, enquiries } = record;
  const formatReceivedAt = (value: Date | string) => new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

  return (
    
      <DashboardPageScaffold
        eyebrow="CRM"
        title={`${customer.firstName} ${customer.lastName}`}
        description="Contact details, work history, billing, and messages all in one place."
        section="crm"
        actions={(
          <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/crm">
            Back to CRM
          </Link>
        )}
      >

      {query.updated === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Customer details updated.</p>
        </div>
      ) : null}
      {query.message === "sent" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Message sent and logged on the customer record.</p>
        </div>
      ) : null}
      {(query as Record<string, string>).reminder === "created" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Rebook reminder set.</p>
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-red-500">
          <p>Something went wrong. Check your integrations and try again.</p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Jobs</div>
            <div className="text-3xl font-semibold">{customer.jobs.length}</div>
            <p className="text-sm text-muted-foreground">Work records already attached to this customer.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Quotes</div>
            <div className="text-3xl font-semibold">{customer.quotes.length}</div>
            <p className="text-sm text-muted-foreground">Drafted or accepted quote history on the account.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Invoices</div>
            <div className="text-3xl font-semibold">{customer.invoices.length}</div>
            <p className="text-sm text-muted-foreground">Billing records tied back to the same customer.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Contact details</div>
            <h2>How to reach them</h2>
          </div>

          <div className="space-y-3">
            {[
              ["Email", customer.email],
              ["Phone", customer.phone ?? "Not set"],
              ["Address", customer.address ?? "Not set"],
              ["Suburb", customer.suburb ?? "Not set"],
              ["Rating", customer.ratingAverage?.toFixed(1) ?? "No ratings yet"]
            ].map(([label, value]) => (
              <div key={label} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{label}</span>
                  </div>
                  <p>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action={`/api/tenant/crm/customers/${customer.id}/update`} method="post" className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Edit customer</div>
            <h2>Update details</h2>
            <p>Changes apply across all jobs, invoices, and records linked to this customer.</p>
          </div>

          <input type="hidden" name="returnTo" value={`/dashboard/crm/${customer.id}`}  />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              First name
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="firstName" defaultValue={customer.firstName} required />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Last name
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="lastName" defaultValue={customer.lastName} required />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Email
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" defaultValue={customer.email} required />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Phone
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="phone" defaultValue={customer.phone ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Address
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="address" defaultValue={customer.address ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Suburb
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="suburb" defaultValue={customer.suburb ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground md:col-span-2">
              Notes
              <textarea className="textarea" name="notes" defaultValue={customer.notes ?? ""} />
            </label>
          </div>

          <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save customer</SubmitButton>
        </form>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Jobs</div>
            <h2>Work history</h2>
            <p>All jobs linked to this customer.</p>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.jobs.length > 0 ? customer.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell><Link className="inline-entity-link" href={getJobRecordHref(job.id)}>{job.summary}</Link></TableCell>
                    <TableCell>{job.status}</TableCell>
                    <TableCell>{job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "TBD"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-slate-500 text-center">No jobs recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Invoices</div>
            <h2>Billing history</h2>
            <p>Outstanding or historic invoices remain easy to reopen from the customer record.</p>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.length > 0 ? customer.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell><Link className="inline-entity-link" href={getInvoiceRecordHref(invoice.id)}>{invoice.number}</Link></TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>${invoice.amount}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-slate-500 text-center">No invoices recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <ManualCommunicationForm
          customerId={customer.id}
          returnTo={`/dashboard/crm/${customer.id}`}
          title="Send manual message"
          includeSignatureDefault={tenantProfile?.emailSignatureAdHocDefault ?? true}
        />

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Recent communication</div>
            <h2>Latest outreach</h2>
            <p>All messages sent to or from this customer.</p>
          </div>

          <div className="space-y-3">
            {communications.length > 0 ? communications.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{entry.status}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No communication recorded for this customer yet.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Requests</div>
            <h2>Requests from this customer</h2>
            <p>Review the request details and create a quote if one has not been started yet.</p>
          </div>
        </div>

        <div className="space-y-3">
          {enquiries.length > 0 ? enquiries.map((enquiry) => (
            <div key={enquiry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${enquiry.status === "new" ? "is-warning" : "is-off"}`}>{enquiry.status}</span>
                  <span>Received {formatReceivedAt(enquiry.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{customer.suburb ? `Suburb: ${customer.suburb}` : "Suburb: Not provided"}</p>
                <h3>{enquiry.serviceRequest}</h3>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {enquiry.quote ? (
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                ) : (
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={`/dashboard/quotes/new?customerId=${customer.id}&enquiryId=${enquiry.id}`}>Create quote</Link>
                )}
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No enquiries recorded for this customer yet.</p>}
        </div>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Quotes and agreements</div>
            <h2>Commercial history</h2>
            <p>Quotes sent and agreements signed for this customer.</p>
          </div>

          <div className="space-y-3">
            {customer.quotes.map((quote) => (
              <div key={quote.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">Quote</span>
                    <span>{quote.status}</span>
                  </div>
                  <h3>{quote.title}</h3>
                  <p>${quote.amount}</p>
                </div>
              </div>
            ))}
            {customer.agreements.map((agreement) => (
              <div key={agreement.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">Agreement</span>
                    <span>{agreement.status}</span>
                  </div>
                  <h3>{agreement.title}</h3>
                </div>
              </div>
            ))}
            {customer.quotes.length === 0 && customer.agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes or agreements recorded yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Feedback and reminders</div>
            <h2>Follow-up signals</h2>
            <p>Post-job feedback and upcoming rebook reminders.</p>
          </div>

          <div className="space-y-3">
            {feedback.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            ))}
            {reminders.map((reminder) => (
              <div key={reminder.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${reminder.status === "pending" ? "is-warning" : "is-off"}`}>Rebook reminder</span>
                  </div>
                  <p>{reminder.status} · due {new Date(reminder.dueAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {feedback.length === 0 && reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feedback or rebook reminders recorded for <CustomerLink customerId={customer.id} className="inline-entity-link">{customer.firstName}</CustomerLink> yet.
              </p>
            ) : null}

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <form className="space-y-4" action="/api/tenant/reminders/create" method="post">
                <input type="hidden" name="customerId" value={customer.id} />
                <div className="flex gap-2.5 items-end flex-wrap">
                  <label className="flex flex-col gap-2 text-sm text-muted-foreground flex-1 min-w-[180px]">
                    Remind me on
                    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" type="date" name="dueAt" required />
                  </label>
                  <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Setting...">Set reminder</SubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
