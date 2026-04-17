import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { CustomersTable } from "./customers-table";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage({
  searchParams
}: {
  searchParams: Promise<{ closed?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const snapshot = await getCrmSnapshot(session.tenantId);

  const openEnquiries = snapshot.enquiries.filter((entry) => entry.status === "new");
  const customersWithOverdueInvoices = new Set(snapshot.overdueInvoices.map((invoice) => invoice.customerId)).size;
  const activeCustomers = snapshot.customers.filter((customer) => customer.jobs.length > 0 || customer.quotes.length > 0).length;

  return (
    
      <DashboardPageScaffold
        eyebrow="CRM"
        title="Customer context without the noise."
        description="Track who is new, who needs a follow-up, and who already has work, billing, or feedback history attached to their record."
        section="crm"
      >

      {query.closed === "1" ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #22c55e" }}>
          Enquiry closed and removed from the active queue.
        </div>
      ) : null}

      {query.error ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #ef4444" }}>
          Something went wrong. Please try again.
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Customers</div>
            <div className="text-3xl font-semibold">{snapshot.customers.length}</div>
            <p className="text-sm text-muted-foreground">{activeCustomers} currently have jobs or quotes attached.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Open enquiries</div>
            <div className="text-3xl font-semibold">{openEnquiries.length}</div>
            <p className="text-sm text-muted-foreground">New requests still waiting for a quote or manual close-out.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Billing risk</div>
            <div className="text-3xl font-semibold">{snapshot.overdueInvoices.length}</div>
            <p className="text-sm text-muted-foreground">{customersWithOverdueInvoices} customer{customersWithOverdueInvoices === 1 ? "" : "s"} have overdue invoices.</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/crm/customers" method="post">
          <div className="space-y-2">
            <div className="eyebrow">New customer</div>
            <h2 style={{ marginBottom: 8 }}>Add a customer record</h2>
            <p>Add a contact once and everything — quotes, jobs, invoices, and messages — links back to the same record.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            First name
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="firstName" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Last name
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="lastName" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Email
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Phone
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="phone" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Address
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="address" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Suburb
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="suburb" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Notes
            <textarea className="textarea" name="notes" placeholder="Internal notes — not visible to the customer." />
          </label>
          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Create customer</button>
        </form>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Priority view</div>
            <h2 style={{ marginBottom: 8 }}>What needs your attention</h2>
            <p>Open enquiries and overdue invoices across all your customers.</p>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${openEnquiries.length > 0 ? "is-warning" : "is-off"}`}>{openEnquiries.length > 0 ? "Open" : "Clear"}</span>
                </div>
                <h3>Enquiry queue</h3>
                <p>{openEnquiries.length > 0 ? `${openEnquiries.length} new enquiry${openEnquiries.length === 1 ? "" : "ies"} need a quote or close-out.` : "No fresh enquiries are waiting right now."}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="#recent-enquiries">Review enquiries</Link>
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${snapshot.overdueInvoices.length > 0 ? "is-warning" : "is-off"}`}>{snapshot.overdueInvoices.length > 0 ? "Overdue" : "Clear"}</span>
                </div>
                <h3>Billing follow-up</h3>
                <p>{snapshot.overdueInvoices.length > 0 ? `${snapshot.overdueInvoices.length} invoice${snapshot.overdueInvoices.length === 1 ? "" : "s"} are overdue across ${customersWithOverdueInvoices} customer${customersWithOverdueInvoices === 1 ? "" : "s"}.` : "No overdue invoices are linked to CRM customers."}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/invoices">Open invoices</Link>
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Record quality</span>
                </div>
                <h3>Full customer history</h3>
                <p>Quotes, jobs, invoices, messages, and feedback all live on the same customer record.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="recent-enquiries" className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Recent enquiries</div>
            <h2>Incoming requests</h2>
            <p>Create a quote, or close the enquiry if it&apos;s no longer active.</p>
          </div>
        </div>

        <div className="space-y-3">
          {snapshot.enquiries.length > 0 ? (
            snapshot.enquiries.map((enquiry) => (
              <div key={enquiry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${enquiry.status === "new" ? "is-warning" : "is-off"}`}>{enquiry.status}</span>
                    <span>{new Date(enquiry.createdAt).toLocaleString()}</span>
                  </div>
                  <h3>
                    <CustomerLink customerId={enquiry.customerId} className="inline-entity-link">
                      {enquiry.customer.firstName} {enquiry.customer.lastName}
                    </CustomerLink>
                  </h3>
                  <p>{enquiry.serviceRequest}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {enquiry.quote ? (
                    <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                  ) : (
                    <>
                      <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/dashboard/quotes?customerId=${enquiry.customerId}&enquiryId=${enquiry.id}`}>Create quote</Link>
                      <form action={`/api/tenant/enquiries/${enquiry.id}/close`} method="post">
                        <input type="hidden" name="returnTo" value="/dashboard/crm" />
                        <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Close enquiry</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No enquiries captured yet. Your public enquiry form will feed this queue automatically.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Customer directory</div>
            <h2>All customers</h2>
          </div>
        </div>

        <CustomersTable customers={snapshot.customers} />
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Recent feedback</div>
            <h2 style={{ marginBottom: 8 }}>Customer sentiment</h2>
            <p>Post-job ratings and comments from your customers.</p>
          </div>
          <div className="space-y-3">
            {snapshot.feedback.length > 0 ? snapshot.feedback.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${entry.rating >= 5 ? "is-on" : "is-off"}`}>{entry.rating} stars</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{entry.comment ?? "No comment supplied."}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No feedback recorded yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Recent communication</div>
            <h2 style={{ marginBottom: 8 }}>Latest messages and outreach</h2>
            <p>Recent outbound messages sent to your customers.</p>
          </div>
          <div className="space-y-3">
            {snapshot.communications.length > 0 ? snapshot.communications.map((entry) => (
              <div key={entry.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">{entry.channel.toUpperCase()}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{entry.subject ?? entry.body}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No communication recorded yet.</p>}
          </div>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
