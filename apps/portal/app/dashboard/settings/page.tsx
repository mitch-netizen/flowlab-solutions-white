import { getPricingModel } from "@flowlab/contracts";
import { getPendingRateSuggestions, getTenantSettingsSnapshot } from "@flowlab/db";

import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";
import CustomDomainSection from "./CustomDomainSection";
import RateSuggestionsPanel from "./RateSuggestionsPanel";

function getPricingModelLabel(model: ReturnType<typeof getPricingModel>) {
  switch (model) {
    case "area_based":
      return "Area based";
    case "hourly":
      return "Hourly";
    default:
      return "Flat rate";
  }
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireTenantSession();
  const params = searchParams ? await searchParams : {};
  const [snapshot, rateSuggestions] = await Promise.all([
    getTenantSettingsSnapshot(session.tenantId),
    getPendingRateSuggestions(session.tenantId)
  ]);

  const pricingModel = getPricingModel(snapshot.profile?.businessType);
  const domainStatus = snapshot.profile?.customDomain
    ? snapshot.profile?.customDomainVerified ? "Verified" : "Pending"
    : "FlowLab subdomain";

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Keep profile, pricing, and brand settings readable."
        description="This page should feel like business configuration, not admin sprawl. Update the business identity, confirm pricing logic, and keep the customer-facing brand consistent."
        section="setup"
      />

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Business</div>
            <div className="setup-summary-value">{snapshot.profile?.businessName ?? "Unnamed"}</div>
            <p className="setup-summary-copy">{snapshot.profile?.tagline ?? "Add a short tagline so the public pages feel deliberate."}</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Pricing model</div>
            <div className="setup-summary-value">{getPricingModelLabel(pricingModel)}</div>
            <p className="setup-summary-copy">{snapshot.pricingRates.length} pricing rate{snapshot.pricingRates.length === 1 ? "" : "s"} currently configured.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Custom domain</div>
            <div className="setup-summary-value">{domainStatus}</div>
            <p className="setup-summary-copy">{snapshot.profile?.customDomain ?? `${snapshot.tenant?.slug ?? "your-business"}.flowlabsolutions.au`}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/settings/profile" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Business details</div>
            <h2 style={{ marginBottom: 8 }}>Core contact and service information</h2>
            <p>The main business facts should live together so the operator can update them without hunting across multiple forms.</p>
          </div>

          <div className="setup-field-grid">
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
            <label className="label is-full">
              Service area suburbs
              <input className="input" name="serviceAreaSuburbs" defaultValue={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
            </label>
            <label className="label is-full">
              Custom domain
              <input className="input" name="customDomain" defaultValue={snapshot.profile?.customDomain ?? ""} placeholder="service.yourdomain.com" />
            </label>
          </div>

          <button className="cta" type="submit">
            Save business details
          </button>
        </form>

        <form className="surface form-grid" action="/api/tenant/settings/profile" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Branding</div>
            <h2 style={{ marginBottom: 8 }}>Customer-facing colour system</h2>
            <p>These colours carry through your quote, agreement, invoice, and public surfaces, so the controls should stay compact and obvious.</p>
          </div>

          <input type="hidden" name="businessName" value={snapshot.profile?.businessName ?? ""} />
          <input type="hidden" name="tagline" value={snapshot.profile?.tagline ?? ""} />
          <input type="hidden" name="phone" value={snapshot.profile?.phone ?? ""} />
          <input type="hidden" name="email" value={snapshot.profile?.email ?? ""} />
          <input type="hidden" name="serviceAreaSuburbs" value={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
          <input type="hidden" name="customDomain" value={snapshot.profile?.customDomain ?? ""} />

          <div className="setup-field-grid">
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
          </div>

          <div className="setup-row-actions" style={{ justifyContent: "flex-start" }}>
            <button className="cta" type="submit">
              Save branding
            </button>
            <a className="ghost" href="/dashboard/automations">
              Open automation controls
            </a>
          </div>
        </form>
      </div>

      <div className="cards-2">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Pricing rates</div>
            <h2 style={{ marginBottom: 8 }}>Current pricing configuration</h2>
            <p>The operator should be able to confirm the pricing basis in one scan before jumping back into onboarding to edit it.</p>
          </div>

          <div className="setup-list">
            {snapshot.pricingRates.length > 0 ? snapshot.pricingRates.map((rate) => {
              const summary =
                pricingModel === "area_based"
                  ? `$${rate.baseRatePerSquareM ?? "—"}/m² · Overgrown $${rate.overgrownRate ?? "—"}/m² · Minimum $${rate.minimumCharge ?? "—"}`
                  : pricingModel === "hourly"
                    ? `$${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`
                    : `Call-out $${rate.calloutFee ?? "—"} · Minimum $${rate.minimumCharge ?? "—"}`;

              return (
                <div key={rate.id} className="setup-row">
                  <div className="setup-row-main">
                    <div className="setup-row-meta">
                      <span className="status-pill is-off">{getPricingModelLabel(pricingModel)}</span>
                    </div>
                    <h3>{rate.label}</h3>
                    <p>{summary}</p>
                  </div>
                </div>
              );
            }) : <p className="setup-note">No pricing rates configured yet.</p>}
          </div>

          <a href="/dashboard/onboarding?step=3" className="ghost" style={{ justifySelf: "start" }}>
            Edit pricing
          </a>
        </div>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Service templates</div>
            <h2 style={{ marginBottom: 8 }}>Reusable services and default durations</h2>
            <p>Templates keep quoting and job creation faster when the common service types are already defined.</p>
          </div>

          {params.service === "created" ? (
            <div className="surface-alert is-success" style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#86efac" }}>
              Service template added.
            </div>
          ) : params.service === "deleted" ? (
            <div className="surface-alert is-warning" style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#fde68a" }}>
              Service template removed.
            </div>
          ) : null}

          <div className="setup-list">
            {snapshot.serviceTemplates.length > 0 ? snapshot.serviceTemplates.map((service) => (
              <div key={service.id} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className="status-pill is-off">Template</span>
                  </div>
                  <h3>{service.name}</h3>
                  <p>${service.defaultPrice ?? 0} · {service.defaultDuration ?? 0} mins</p>
                </div>
                <div className="setup-row-actions">
                  <form action={`/api/tenant/settings/services?id=${service.id}`} method="post">
                    <input type="hidden" name="_method" value="DELETE" />
                    <button className="ghost" type="submit" style={{ fontSize: 12 }}>Remove</button>
                  </form>
                </div>
              </div>
            )) : <p className="setup-note">No service templates saved yet.</p>}
          </div>

          <form action="/api/tenant/settings/services" method="post" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="label" style={{ flex: "2 1 160px" }}>
                Service name
                <input className="input" name="name" placeholder="e.g. Lawn mow — standard block" required />
              </label>
              <label className="label" style={{ flex: "1 1 90px" }}>
                Price ($)
                <input className="input" name="defaultPrice" type="number" min="0" step="0.01" placeholder="0.00" />
              </label>
              <label className="label" style={{ flex: "1 1 90px" }}>
                Duration (mins)
                <input className="input" name="defaultDuration" type="number" min="0" step="5" placeholder="60" />
              </label>
              <button className="ghost" type="submit">Add template</button>
            </div>
          </form>
        </div>
      </div>

      {rateSuggestions.length > 0 ? (
        <RateSuggestionsPanel suggestions={rateSuggestions} />
      ) : null}

      <CustomDomainSection
        currentDomain={snapshot.profile?.customDomain ?? null}
        isVerified={snapshot.profile?.customDomainVerified ?? false}
        tenantSlug={snapshot.tenant?.slug ?? ""}
      />
    </div>
  );
}
