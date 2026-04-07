import Link from "next/link";

import { getCurrentTenantContext } from "../lib/tenant";

export default async function PortalHomePage() {
  const tenant = await getCurrentTenantContext();

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant?.branding.businessName ?? "Tenant portal"}</div>
          <h1 style={{ fontSize: "clamp(3rem, 8vw, 4.8rem)", lineHeight: 1, marginBottom: 12 }}>
            White-label operations that feel like your own software.
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: 18, lineHeight: 1.7 }}>
            Customers only see your brand. You get onboarding, quoting, scheduling, invoicing, health, and a mobile-first operator workspace under one tenant-aware portal.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/login" className="cta">
              Operator login
            </Link>
            <Link href="/enquiry" className="ghost">
              Open enquiry form
            </Link>
          </div>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Reference environment</h2>
          <p style={{ color: "#cbd5e1" }}>
            Local development falls back to Quinny&apos;s Mowing Service so the white-label flows render even before wildcard DNS is configured.
          </p>
          <div className="cards-2">
            <div className="surface-soft">
              <strong>Host</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{tenant?.host ?? "localhost:3001"}</div>
            </div>
            <div className="surface-soft">
              <strong>Plan</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{tenant?.plan ?? "professional"}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
