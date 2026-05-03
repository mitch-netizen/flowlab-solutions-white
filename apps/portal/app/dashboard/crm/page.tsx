import Link from "next/link";

import { getCrmSnapshot } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { CustomersTable } from "./customers-table";
import { requireTenantSession } from "../../../lib/session";

export default async function CrmPage({
  searchParams
}: {
  searchParams: Promise<{ closed?: string; error?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const snapshot = await getCrmSnapshot(session.tenantId);

  const formatReceivedAt = (value: Date | string) => new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

  return (
    
      <DashboardPageScaffold
        eyebrow="CRM"
        title="Customer context without the noise."
        description="Track who is new, who needs a follow-up, and who already has work, billing, or feedback history attached to their record."
        section="crm"
      >

      {query.closed === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-green-500">
          Enquiry closed and removed from the active queue.
        </div>
      ) : null}

      {query.error ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 border-l-red-500">
          Something went wrong. Please try again.
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="eyebrow">Requests inbox</div>
        <h2>Incoming customer requests</h2>
        <p className="text-sm text-muted-foreground">This is where new customer requests land. Open each request, confirm the details, then create a quote as the next step.</p>
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
                  <p>{enquiry.serviceRequest}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {enquiry.quote ? (
                    <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/quote/${enquiry.quote.accessToken}`}>Open quote</Link>
                  ) : (
                    <>
                      <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={`/dashboard/quotes?customerId=${enquiry.customerId}&enquiryId=${enquiry.id}`}>Create quote</Link>
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
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No requests yet. Customer requests from your booking link will appear here automatically.</p>
              <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/onboarding">Open booking link</Link>
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
