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
        <div className="surface">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h1>Tell us what you need done.</h1>
          <p style={{ color: "#cbd5e1" }}>Fill in your details below and we&apos;ll get back to you with a quote shortly.</p>
          {query.submitted === "1" ? (
            <div className="surface-soft" style={{ marginTop: 16, color: "#86efac" }}>
              Thanks. Your enquiry is in and the team will be in touch shortly.
            </div>
          ) : null}
          {query.error ? (
            <div className="surface-soft" style={{ marginTop: 16, color: "#fca5a5" }}>
              {query.error === "rate_limited"
                ? "Too many enquiries were sent from this connection. Please wait a little and try again."
                : query.error === "limit"
                  ? "This tenant has reached its current plan limit for new jobs. Please contact the business directly."
                  : "We couldn’t submit that enquiry. Please check the details and try again."}
            </div>
          ) : null}
        </div>
        <form action="/api/public/enquiry" method="post" className="surface form-grid">
          <input type="hidden" name="tenantId" value={tenant.tenantId} />
          <input type="hidden" name="formStartedAt" value={startedAt} />
          <input type="text" name="website" autoComplete="off" tabIndex={-1} style={{ position: "absolute", left: "-9999px", opacity: 0 }} />
          <label className="label">
            First name
            <input className="input" name="firstName" required />
          </label>
          <label className="label">
            Last name
            <input className="input" name="lastName" required />
          </label>
          <label className="label">
            Email
            <input className="input" name="email" type="email" required />
          </label>
          <label className="label">
            Phone
            <input className="input" name="phone" />
          </label>
          <label className="label">
            Address
            <input className="input" name="address" />
          </label>
          <label className="label">
            Suburb
            <input className="input" name="suburb" />
          </label>
          <label className="label">
            What do you need?
            <textarea className="textarea" name="serviceRequest" required />
          </label>
          <button className="cta" type="submit">
            Submit enquiry
          </button>
        </form>
      </section>
    </main>
  );
}
