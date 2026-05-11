import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../components/submit-button";
import { CustomersTable } from "./customers-table";
import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage({
  searchParams
}: {
  searchParams: Promise<{ closed?: string; error?: string; created?: string; returnTo?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const snapshot = await getCrmSnapshot(session.tenantId);
  const returnTo = query.returnTo?.startsWith("/dashboard/") ? query.returnTo : "";

  const formatReceivedAt = (value: Date | string) => new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

  const customerJobMap = new Map(snapshot.customers.map(c => [c.id, c.jobs]));

  return (
    
      <DashboardPageScaffold
        eyebrow="CRM"
        title="Customers"
        description="New requests land here first. Review each one, convert to a quote, then track the full history — jobs, invoices, and messages — on the customer record."
        section="crm"
      >

      {query.closed === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-green-500">
          Enquiry closed and removed from the active queue.
        </div>
      ) : null}

      {query.error ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-red-500">
          {query.error === "invalid_customer"
            ? "First name, last name, and email are required."
            : query.error === "customer_conflict"
              ? "Email and phone match different customers. Please open the right customer record before continuing."
            : "Something went wrong. Please try again."}
        </div>
      ) : null}

      {query.created === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-green-500">
          Customer saved successfully.
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Add customer</div>
          <h2 id="manual-add">Add a customer manually</h2>
          <p className="text-sm text-muted-foreground">Add a customer directly — for phone enquiries, referrals, or repeat clients not in the system yet. Only first name, last name, and email are required.</p>
        </div>
        <form action="/api/tenant/crm/customers" method="post" className="grid gap-3 md:grid-cols-2">
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <label className="space-y-1 text-sm">
            <span>First name *</span>
            <input name="firstName" required className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Last name *</span>
            <input name="lastName" required className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Email *</span>
            <input name="email" type="email" required className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Phone</span>
            <input name="phone" type="tel" className="w-full rounded-md border bg-background px-3 py-2" placeholder="04xx xxx xxx" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Suburb</span>
            <input name="suburb" className="w-full rounded-md border bg-background px-3 py-2" title="Used for service-area filtering and travel-time estimates." />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Address</span>
            <input name="address" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Full street address — helps with GPS routing. Suburb alone is fine if unknown." title="Full address for GPS navigation and service-area checks. Suburb alone is OK if address is not yet provided." />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Notes</span>
            <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="e.g. large property, dog on site, prefers afternoon visits" />
          </label>
          <div className="md:col-span-2">
            <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" loadingText="Saving...">
              Save customer
            </SubmitButton>
          </div>
        </form>
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
                    <span>Received {formatReceivedAt(enquiry.createdAt)}</span>
                  </div>
                  <h3>
                    <CustomerLink customerId={enquiry.customerId} className="inline-entity-link">
                      {enquiry.customer.firstName} {enquiry.customer.lastName}
                    </CustomerLink>
                  </h3>
                  <p className="text-sm text-muted-foreground">{enquiry.customer.suburb ? `Suburb: ${enquiry.customer.suburb}` : "Suburb: Not provided"}</p>
                  {(() => {
                    const jobs = customerJobMap.get(enquiry.customerId) ?? [];
                    return (
                      <p className="text-sm text-muted-foreground">
                        {jobs.length > 0
                          ? `${jobs.length} past job${jobs.length === 1 ? "" : "s"} · Last: ${jobs[0]!.status.replace(/_/g, " ")}`
                          : "New customer — no prior jobs"}
                      </p>
                    );
                  })()}
                  <p>{enquiry.serviceRequest}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {enquiry.quote ? (
                    <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                  ) : (
                    <>
                      <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={`/dashboard/quotes/new?customerId=${enquiry.customerId}&enquiryId=${enquiry.id}`}>Create quote</Link>
                      <form action={`/api/tenant/enquiries/${enquiry.id}/close`} method="post">
                        <input type="hidden" name="returnTo" value="/dashboard/crm" />
                        <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Closing...">Close</SubmitButton>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No open requests yet. When customers submit a request through your booking page, they will appear here.</p>
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/dashboard/quotes/new">Create a quote manually</Link>
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/onboarding">View your booking link</Link>
              </div>
            </div>
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

    </DashboardPageScaffold>
  );
}
