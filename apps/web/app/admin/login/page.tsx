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
        <form action="/api/auth/platform/login" method="post" className="hero-card form-grid">
          <label className="label">
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="label">
            Password
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="cta">
            Open superadmin
          </button>
        </form>
      </section>
    </main>
  );
}
