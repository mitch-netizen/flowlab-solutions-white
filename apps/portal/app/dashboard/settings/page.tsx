import { getPricingModel } from "@flowlab/contracts";
import { getPendingRateSuggestions, getTenantSettingsSnapshot } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
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
    : "Default subdomain";

  return (
    
      <DashboardPageScaffold
        eyebrow="Setup"
        title="Settings"
        description="Update your business details, branding colours, pricing rates, and service templates."
        section="setup"
      >

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Business</div>
            <div className="text-3xl font-semibold">{snapshot.profile?.businessName ?? "Unnamed"}</div>
            <p className="text-sm text-muted-foreground">{snapshot.profile?.tagline ?? "Add a short tagline so the public pages feel deliberate."}</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pricing model</div>
            <div className="text-3xl font-semibold">{getPricingModelLabel(pricingModel)}</div>
            <p className="text-sm text-muted-foreground">{snapshot.pricingRates.length} pricing rate{snapshot.pricingRates.length === 1 ? "" : "s"} currently configured.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Custom domain</div>
            <div className="text-3xl font-semibold">{domainStatus}</div>
            <p className="text-sm text-muted-foreground">{snapshot.profile?.customDomain ?? `${snapshot.tenant?.slug ?? "your-business"}.portal.domain`}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/settings/profile" method="post">
          <div className="space-y-2">
            <div className="eyebrow">Business details</div>
            <h2 style={{ marginBottom: 8 }}>Core contact and service information</h2>
            <p>Your business name, contact details, and service area all in one form.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Business name
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="businessName" defaultValue={snapshot.profile?.businessName ?? ""} required />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Tagline
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="tagline" defaultValue={snapshot.profile?.tagline ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Phone
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="phone" defaultValue={snapshot.profile?.phone ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Email
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="email" type="email" defaultValue={snapshot.profile?.email ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground md:col-span-2">
              Service area suburbs
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="serviceAreaSuburbs" defaultValue={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground md:col-span-2">
              Custom domain
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customDomain" defaultValue={snapshot.profile?.customDomain ?? ""} placeholder="service.yourdomain.com" />
            </label>
          </div>

          <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Save business details
          </button>
        </form>

        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/settings/profile" method="post">
          <div className="space-y-2">
            <div className="eyebrow">Branding</div>
            <h2 style={{ marginBottom: 8 }}>Customer-facing colour system</h2>
            <p>Applied to your quote, agreement, invoice, and all other customer-facing pages.</p>
          </div>

          <input type="hidden" name="businessName" value={snapshot.profile?.businessName ?? ""} />
          <input type="hidden" name="tagline" value={snapshot.profile?.tagline ?? ""} />
          <input type="hidden" name="phone" value={snapshot.profile?.phone ?? ""} />
          <input type="hidden" name="email" value={snapshot.profile?.email ?? ""} />
          <input type="hidden" name="serviceAreaSuburbs" value={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
          <input type="hidden" name="customDomain" value={snapshot.profile?.customDomain ?? ""} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Primary colour
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="primaryColour" type="color" defaultValue={snapshot.profile?.primaryColour ?? "#2D5016"} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Secondary colour
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="secondaryColour" type="color" defaultValue={snapshot.profile?.secondaryColour ?? "#1F2937"} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Accent colour
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="accentColour" type="color" defaultValue={snapshot.profile?.accentColour ?? "#84CC16"} />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2" style={{ justifyContent: "flex-start" }}>
            <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
              Save branding
            </button>
            <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/automations">
              Open automation controls
            </a>
          </div>
        </form>
      </div>

      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Pricing rates</div>
            <h2 style={{ marginBottom: 8 }}>Current pricing configuration</h2>
            <p>Your current pricing model and configured rates. Edit them from the onboarding wizard.</p>
          </div>

          <div className="space-y-3">
            {snapshot.pricingRates.length > 0 ? snapshot.pricingRates.map((rate) => {
              const summary =
                pricingModel === "area_based"
                  ? `$${rate.baseRatePerSquareM ?? "—"}/m² · Overgrown $${rate.overgrownRate ?? "—"}/m² · Minimum $${rate.minimumCharge ?? "—"}`
                  : pricingModel === "hourly"
                    ? `$${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`
                    : `Call-out $${rate.calloutFee ?? "—"} · Minimum $${rate.minimumCharge ?? "—"}`;

              return (
                <div key={rate.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="status-pill is-off">{getPricingModelLabel(pricingModel)}</span>
                    </div>
                    <h3>{rate.label}</h3>
                    <p>{summary}</p>
                  </div>
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">No pricing rates configured yet.</p>}
          </div>

          <a href="/dashboard/onboarding?step=3" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" style={{ justifySelf: "start" }}>
            Edit pricing
          </a>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Service templates</div>
            <h2 style={{ marginBottom: 8 }}>Reusable services and default durations</h2>
            <p>Templates keep quoting and job creation faster when the common service types are already defined.</p>
          </div>

          {params.service === "created" ? (
            <div className="border-l-4 pl-4 border-l-emerald-500" style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#86efac" }}>
              Service template added.
            </div>
          ) : params.service === "deleted" ? (
            <div className="border-l-4 pl-4 border-l-amber-500" style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#fde68a" }}>
              Service template removed.
            </div>
          ) : null}

          <div className="space-y-3">
            {snapshot.serviceTemplates.length > 0 ? snapshot.serviceTemplates.map((service) => (
              <div key={service.id} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">Template</span>
                  </div>
                  <h3>{service.name}</h3>
                  <p>${service.defaultPrice ?? 0} · {service.defaultDuration ?? 0} mins</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <form action={`/api/tenant/settings/services?id=${service.id}`} method="post">
                    <input type="hidden" name="_method" value="DELETE" />
                    <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit" style={{ fontSize: 12 }}>Remove</button>
                  </form>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No service templates saved yet.</p>}
          </div>

          <form action="/api/tenant/settings/services" method="post" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground" style={{ flex: "2 1 160px" }}>
                Service name
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="name" placeholder="e.g. Lawn mow — standard block" required />
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground" style={{ flex: "1 1 90px" }}>
                Price ($)
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="defaultPrice" type="number" min="0" step="0.01" placeholder="0.00" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground" style={{ flex: "1 1 90px" }}>
                Duration (mins)
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="defaultDuration" type="number" min="0" step="5" placeholder="60" />
              </label>
              <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Add template</button>
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
    </DashboardPageScaffold>
  );
}
