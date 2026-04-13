import { getPricingModel } from "@flowlab/contracts";
import { getTenantSettingsSnapshot, getPendingRateSuggestions } from "@flowlab/db";

import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";
import RateSuggestionsPanel from "./RateSuggestionsPanel";
import CustomDomainSection from "./CustomDomainSection";

export default async function SettingsPage() {
  const session = await requireTenantSession();
  const [snapshot, rateSuggestions] = await Promise.all([
    getTenantSettingsSnapshot(session.tenantId),
    getPendingRateSuggestions(session.tenantId)
  ]);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Control your business profile, pricing, and brand setup."
        description="This is the configuration layer of the portal: how the business appears, how pricing is shaped, and how the customer-facing experience stays on-brand."
        section="setup"
      />
      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/settings/profile" method="post">
          <h2 style={{ marginTop: 0 }}>Business details</h2>
          <label className="label">
            Business name
            <input className="input" name="businessName" defaultValue={snapshot.profile?.businessName ?? ""} required />
          </label>
          <label className="label">
            Tagline
            <input className="input" name="tagline" defaultValue={snapshot.profile?.tagline ?? ""} />
          </label>
          <label className="label">
            Phone
            <input className="input" name="phone" defaultValue={snapshot.profile?.phone ?? ""} />
          </label>
          <label className="label">
            Email
            <input className="input" name="email" type="email" defaultValue={snapshot.profile?.email ?? ""} />
          </label>
          <label className="label">
            Service area suburbs
            <input className="input" name="serviceAreaSuburbs" defaultValue={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
          </label>
          <label className="label">
            Custom domain
            <input className="input" name="customDomain" defaultValue={snapshot.profile?.customDomain ?? ""} placeholder="service.yourdomain.com" />
          </label>
          <button className="cta" type="submit">
            Save settings
          </button>
        </form>
        <form className="surface form-grid" action="/api/tenant/settings/profile" method="post">
          <h2 style={{ marginTop: 0 }}>Branding</h2>
          <input type="hidden" name="businessName" value={snapshot.profile?.businessName ?? ""} />
          <input type="hidden" name="tagline" value={snapshot.profile?.tagline ?? ""} />
          <input type="hidden" name="phone" value={snapshot.profile?.phone ?? ""} />
          <input type="hidden" name="email" value={snapshot.profile?.email ?? ""} />
          <input type="hidden" name="serviceAreaSuburbs" value={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
          <input type="hidden" name="customDomain" value={snapshot.profile?.customDomain ?? ""} />
          <label className="label">
            Primary colour
            <input className="input" name="primaryColour" type="color" defaultValue={snapshot.profile?.primaryColour ?? "#2D5016"} />
          </label>
          <label className="label">
            Secondary colour
            <input className="input" name="secondaryColour" type="color" defaultValue={snapshot.profile?.secondaryColour ?? "#1F2937"} />
          </label>
          <label className="label">
            Accent colour
            <input className="input" name="accentColour" type="color" defaultValue={snapshot.profile?.accentColour ?? "#84CC16"} />
          </label>
          <button className="cta" type="submit">
            Save branding
          </button>
          <a className="ghost" href="/api/tenant/blueprints/download">
            Download Make templates
          </a>
        </form>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Pricing rates</h2>
          <div className="stack">
            {snapshot.pricingRates.map((rate) => {
              const model = getPricingModel(snapshot.profile?.businessType);
              const summary =
                model === "area_based"
                  ? `$${rate.baseRatePerSquareM ?? "—"}/m² · Overgrown $${rate.overgrownRate ?? "—"}/m² · Min $${rate.minimumCharge ?? "—"}`
                  : model === "hourly"
                    ? `$${rate.hourlyRate ?? "—"}/hr · Min $${rate.minimumCharge ?? "—"}`
                    : `Call-out $${rate.calloutFee ?? "—"} · Min $${rate.minimumCharge ?? "—"}`;
              return (
                <div key={rate.id} className="surface-soft">
                  <strong>{rate.label}</strong>
                  <div style={{ color: "#cbd5e1", marginTop: 8 }}>{summary}</div>
                </div>
              );
            })}
          </div>
          <a href="/dashboard/onboarding?step=3" style={{ color: "#3b82f6", fontSize: 13, marginTop: 12, display: "inline-block" }}>
            Edit pricing →
          </a>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Service templates</h2>
          <div className="stack">
            {snapshot.serviceTemplates.map((service) => (
              <div key={service.id} className="surface-soft">
                <strong>{service.name}</strong>
                <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                  ${service.defaultPrice ?? 0} · {service.defaultDuration ?? 0} mins
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI rate suggestions */}
      {rateSuggestions.length > 0 && (
        <RateSuggestionsPanel suggestions={rateSuggestions} />
      )}

      {/* Custom domain section */}
      <CustomDomainSection
        currentDomain={snapshot.profile?.customDomain ?? null}
        isVerified={snapshot.profile?.customDomainVerified ?? false}
        tenantSlug={snapshot.tenant?.slug ?? ""}
      />
    </div>
  );
}
