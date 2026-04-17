import Link from "next/link";
import { buildTenantUrl } from "@flowlab/contracts/server";

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; name?: string; email?: string }>;
}) {
  const { slug, name, email } = await searchParams;

  if (!slug) {
    return (
      <main className="shell">
        <section className="hero">
          <div className="hero-card">
            <h1>Something went wrong</h1>
            <p className="muted">No workspace details found. Please try signing up again.</p>
            <Link href="/signup" className="cta">Back to signup</Link>
          </div>
        </section>
      </main>
    );
  }

  const portalUrl = buildTenantUrl(slug, "/login");
  const businessName = name ? decodeURIComponent(name) : slug;

  return (
    <main className="shell">
      <section className="hero" style={{ gridTemplateColumns: "1fr 0.8fr" }}>
        <div className="hero-card">
          <div className="pill">🎉 Account created</div>
          <h1>Setting up your workspace…</h1>
          <p className="muted">
            Your FlowLab portal for <strong>{businessName}</strong> is being provisioned.
            This takes about 2–5 minutes while we configure your branded workspace and
            SSL certificate.
          </p>

          <div className="panel-soft" style={{ margin: "1.5rem 0", padding: "1.25rem 1.5rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", opacity: 0.7 }}>Your portal address will be:</p>
            <p style={{ margin: 0, fontWeight: 600, wordBreak: "break-all" }}>{portalUrl}</p>
          </div>

          {email && (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              ✉️ We've sent a welcome email to <strong>{decodeURIComponent(email)}</strong> with your login link.
              Check your inbox in a few minutes.
            </p>
          )}

          <a href={portalUrl} className="cta" style={{ marginTop: "1.5rem", display: "inline-block" }}>
            Go to my portal →
          </a>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.75rem" }}>
            If the link shows an error, wait 2–3 minutes and try again — SSL provisioning is automatic.
          </p>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>What's being set up</h2>
          <div className="grid">
            <div className="panel-soft">Your branded portal at <strong>{slug}.flowlabsolutions.au</strong></div>
            <div className="panel-soft">Owner login and secure session management</div>
            <div className="panel-soft">6-step onboarding wizard ready on first login</div>
            <div className="panel-soft">Quoting, scheduling, invoicing, and automations</div>
          </div>
        </div>
      </section>
    </main>
  );
}
