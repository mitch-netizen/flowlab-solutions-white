import { getCurrentTenantContext } from "../../../lib/tenant";
import TenantUnavailable from "../../../components/tenant-unavailable";

export default async function EnquiryPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const tenant = await getCurrentTenantContext();
  const startedAt = Date.now();
  const query = await searchParams;

  if (!tenant) {
    return <TenantUnavailable title="Enquiry form unavailable" message="This enquiry form is not connected to an active tenant yet. Double-check the address or contact the business directly." />;
  }

  return (
    <main>
      <section className="hero-grid">
        <div className="rounded-lg border bg-card p-4">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h1>Tell us what you need done.</h1>
          <p style={{ color: "#cbd5e1" }}>Fill in your details below and we&apos;ll get back to you with a quote shortly.</p>
          {query.submitted === "1" ? (
            <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 16, color: "#86efac" }}>
              Thanks. Your enquiry is in and the team will be in touch shortly.
            </div>
          ) : null}
          {query.error ? (
            <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 16, color: "#fca5a5" }}>
              {query.error === "rate_limited"
                ? "Too many enquiries were sent from this connection. Please wait a little and try again."
                : query.error === "limit"
                  ? "This tenant has reached its current plan limit for new jobs. Please contact the business directly."
                  : "We couldn’t submit that enquiry. Please check the details and try again."}
            </div>
          ) : null}
        </div>
        <form action="/api/public/enquiry" method="post" className="rounded-lg border bg-card p-4 space-y-4">
          <input type="hidden" name="tenantId" value={tenant.tenantId} />
          <input type="hidden" name="formStartedAt" value={startedAt} />
          <input type="text" name="website" autoComplete="off" tabIndex={-1} style={{ position: "absolute", left: "-9999px", opacity: 0 }} />
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
            What do you need?
            <textarea className="textarea" name="serviceRequest" required />
          </label>
          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Submit enquiry
          </button>
        </form>
      </section>
    </main>
  );
}
