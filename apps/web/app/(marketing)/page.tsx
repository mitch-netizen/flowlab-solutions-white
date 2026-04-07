import Link from "next/link";

import { listTenants } from "@flowlab/db";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const tenants = await listTenants();

  return (
    <main className="shell">
      <section className="hero">
        <div className="grid">
          <div className="pill">FlowLab Solutions</div>
          <div className="hero-card">
            <h1 style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)", lineHeight: 1, margin: 0 }}>
              White-label AI operations for field service businesses.
            </h1>
            <p className="muted" style={{ fontSize: 18, lineHeight: 1.7 }}>
              FlowLab gives sole operators a branded administration team: enquiry capture, quoting, scheduling, invoicing, reminders, follow-up, and health monitoring across every tenant.
            </p>
            <div className="button-row">
              <Link href="/signup" className="cta">
                Start free trial
              </Link>
              <Link href="/admin" className="secondary-cta">
                Open superadmin
              </Link>
            </div>
          </div>
          <div className="metrics">
            <div className="metric">
              <span className="muted">Reference tenant</span>
              <strong>Quinny&apos;s</strong>
            </div>
            <div className="metric">
              <span className="muted">Current tenants</span>
              <strong>{tenants.length}</strong>
            </div>
            <div className="metric">
              <span className="muted">Core layers</span>
              <strong>3</strong>
            </div>
          </div>
        </div>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Plans</h2>
          <div className="grid">
            {[
              ["Starter", "$79/mo", "FlowLab subdomain, 50 jobs, 50 AI analyses"],
              ["Professional", "$149/mo", "Custom domains, automation blueprints, 200 AI analyses"],
              ["Growth", "$249/mo", "Unlimited AI, API access, multi-user support"]
            ].map(([name, price, detail]) => (
              <div key={name} className="panel-soft">
                <div className="pill">{name}</div>
                <h3 style={{ fontSize: 28, marginBottom: 8 }}>{price}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
