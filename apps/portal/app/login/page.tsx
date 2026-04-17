import { getCurrentTenantContext } from "../../lib/tenant";
import TenantUnavailable from "../../components/tenant-unavailable";

export default async function TenantLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const tenant = await getCurrentTenantContext();
  const query = await searchParams;

  if (!tenant) {
    return <TenantUnavailable title="Tenant login unavailable" message="This portal address is not linked to an active tenant yet. Double-check the URL or contact FlowLab support." />;
  }

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h1>Operator dashboard login</h1>
          <p style={{ color: "#cbd5e1" }}>Enter your operator credentials to access the dashboard.</p>
          {query.created === "1" ? (
            <div className="surface-soft" style={{ marginTop: 16, color: "#86efac" }}>
              Your tenant trial is ready. Sign in below to continue onboarding.
            </div>
          ) : null}
          {query.error ? (
            <div className="surface-soft" style={{ marginTop: 16, color: "#fca5a5" }}>
              {query.error === "tenant"
                ? "This host is not linked to an active tenant."
                : query.error === "rate_limited"
                  ? "Too many login attempts. Please wait a few minutes and try again."
                  : query.error === "captcha"
                    ? "Login is blocked by CAPTCHA. Please contact support."
                    : "Invalid email or password."}
            </div>
          ) : null}
        </div>
        <form action="/api/auth/tenant/login" method="post" className="surface form-grid">
          <label className="label">
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="label">
            Password
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="cta" type="submit">
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
