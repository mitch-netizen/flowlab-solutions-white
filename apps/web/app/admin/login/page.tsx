export default async function PlatformLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="shell">
      <section className="hero" style={{ gridTemplateColumns: "0.9fr 1.1fr" }}>
        <div className="panel">
          <div className="pill">Superadmin access</div>
          <h1>Manage tenants, billing, health, and platform settings.</h1>
          <p className="muted">Use your FlowLab platform credentials to manage tenants, integrations, and launch readiness.</p>
          {query.error ? (
            <div className="panel-soft" style={{ marginTop: 16, color: "#fca5a5" }}>
              {query.error === "rate_limited"
                ? "Too many login attempts. Please wait a few minutes and try again."
                : "Invalid email or password."}
            </div>
          ) : null}
        </div>
        <form action="/api/auth/platform/login" method="post" className="hero-card space-y-4">
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Email
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            Password
            <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Open superadmin
          </button>
        </form>
      </section>
    </main>
  );
}
