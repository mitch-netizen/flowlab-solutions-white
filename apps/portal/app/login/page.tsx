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
        <div className="rounded-lg border bg-card p-4">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h1>Operator dashboard login</h1>
          <p style={{ color: "#cbd5e1" }}>Enter your operator credentials to access the dashboard.</p>
          {query.created === "1" ? (
            <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 16, color: "#86efac" }}>
              Your tenant trial is ready. Sign in below to continue onboarding.
            </div>
          ) : null}
          {query.error ? (
            <div className="rounded-lg border bg-card/60 p-4" style={{ marginTop: 16, color: "#fca5a5" }}>
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
        <form action="/api/auth/tenant/login" method="post" className="rounded-lg border bg-card p-4 space-y-4">
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Email
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Password
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
