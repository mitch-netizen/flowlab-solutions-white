import { getCurrentTenantContext } from "../../lib/tenant";

export default async function TenantLoginPage() {
  const tenant = await getCurrentTenantContext();

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant?.branding.businessName ?? "Tenant access"}</div>
          <h1>Operator dashboard login</h1>
          <p style={{ color: "#cbd5e1" }}>Enter your operator credentials to access the dashboard.</p>
        </div>
        <form action="/api/auth/tenant/login" method="post" className="surface form-grid">
          <label className="label">
            Email
            <input className="input" name="email" type="email" defaultValue="owner@lawnorder.com.au" required />
          </label>
          <label className="label">
            Password
            <input className="input" name="password" type="password" required />
          </label>
          <button className="cta" type="submit">
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
