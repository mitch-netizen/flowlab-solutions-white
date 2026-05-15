import { getCurrentTenantContext } from "../../../lib/tenant";
import TenantUnavailable from "../../../components/tenant-unavailable";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const tenant = await getCurrentTenantContext();
  const query = await searchParams;

  if (!tenant) {
    return <TenantUnavailable title="Page unavailable" message="This portal address is not linked to an active tenant." />;
  }

  return (
    <main>
      <section className="hero-grid">
        <div className="rounded-lg border bg-card p-4">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h1>Reset your password</h1>
          <p style={{ color: "#cbd5e1" }}>
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        {query.sent === "1" ? (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#86efac" }}>
              If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox (and spam folder).
            </div>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Back to login
            </a>
          </div>
        ) : (
          <form
            action="/api/auth/tenant/forgot-password"
            method="post"
            className="rounded-lg border bg-card p-4 space-y-4"
          >
            {query.error ? (
              <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#fca5a5" }}>
                {query.error === "rate_limited"
                  ? "Too many requests. Please wait a few minutes and try again."
                  : "Please enter a valid email address."}
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Email address
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <div className="flex flex-col gap-2">
              <button
                className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                type="submit"
              >
                Send reset link
              </button>
              <a
                href="/login"
                className="text-sm text-center"
                style={{ color: "#94a3b8" }}
              >
                Back to login
              </a>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
