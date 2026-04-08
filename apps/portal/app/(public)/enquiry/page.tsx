import { getCurrentTenantContext } from "../../../lib/tenant";

export default async function EnquiryPage() {
  const tenant = await getCurrentTenantContext();

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant?.branding.businessName ?? "Enquiry"}</div>
          <h1>Tell us what you need done.</h1>
          <p style={{ color: "#cbd5e1" }}>Fill in your details below and we&apos;ll get back to you with a quote shortly.</p>
        </div>
        <form action="/api/public/enquiry" method="post" className="surface form-grid">
          <input type="hidden" name="tenantId" value={tenant?.tenantId ?? ""} />
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
