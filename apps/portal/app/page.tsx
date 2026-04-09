import Link from "next/link";

import TenantUnavailable from "../components/tenant-unavailable";
import { getCurrentTenantContext } from "../lib/tenant";

export default async function PortalHomePage() {
  const tenant = await getCurrentTenantContext();

  if (!tenant) {
    return <TenantUnavailable />;
  }

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant.branding.businessName}</div>
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
          <h2 style={{ marginTop: 0 }}>Everything under your brand</h2>
          <p style={{ color: "#cbd5e1" }}>
            Customers only see your logo, your colours, and your business name. From the first enquiry through to the signed agreement and paid invoice — it&apos;s all yours.
          </p>
          <div className="cards-2">
            <div className="surface-soft">
              <strong>Enquiry intake</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>Branded quote request form, live on your domain.</div>
            </div>
            <div className="surface-soft">
              <strong>Automated follow-up</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>SMS reminders, payment nudges, and rebook prompts — hands-free.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
