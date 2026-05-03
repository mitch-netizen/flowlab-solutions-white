import { getPricingModel } from "@flowlab/contracts";
import { getPendingRateSuggestions, getTenantSettingsSnapshot } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
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
        description="Review or update your business basics, service area, and booking details."
        section="setup"
      >

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="eyebrow">Business basics</div>
        <h2 style={{ marginBottom: 8 }}>Keep your onboarding details up to date</h2>
        <p className="text-sm text-muted-foreground">Update your business name, trade type, phone, suburb or postcode, and service area in one place.</p>
      </div>


      <div className="cards-2 gap-4">
        <form className="surface form-grid space-y-4" action="/api/tenant/settings/profile" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Business details</div>
            <h2 style={{ marginBottom: 8 }}>Core contact and service information</h2>
            <p>Your business name, contact details, and service area all in one form.</p>
          </div>

          <div className="setup-field-grid">
            <div className="space-y-4">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" defaultValue={snapshot.profile?.businessName ?? ""} required />
            </div>
            <div className="space-y-4">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" defaultValue={snapshot.profile?.tagline ?? ""} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" name="phone" defaultValue={snapshot.profile?.phone ?? ""} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={snapshot.profile?.email ?? ""} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="businessType">Trade/business type</Label>
              <select id="businessType" name="businessType" defaultValue={snapshot.profile?.businessType ?? "other"} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="lawn_mowing">Lawn mowing</option>
                <option value="gardening">Gardening</option>
                <option value="cleaning">Cleaning</option>
                <option value="handyman">Handyman</option>
                <option value="pool_service">Pool service</option>
                <option value="pest_control">Pest control</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-4">
              <Label htmlFor="suburb">Main suburb</Label>
              <Input id="suburb" name="suburb" defaultValue={snapshot.profile?.suburb ?? ""} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" name="postcode" defaultValue={snapshot.profile?.postcode ?? ""} />
            </div>
            <div className="space-y-4 is-full">
              <Label htmlFor="serviceAreaSuburbs">Service radius or suburbs</Label>
              <Input id="serviceAreaSuburbs" name="serviceAreaSuburbs" defaultValue={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} placeholder="e.g. 15 km around Carlton, Fitzroy, Brunswick" />
            </div>
            <div className="space-y-4 is-full">
              <Label htmlFor="customDomain">Custom domain</Label>
              <Input id="customDomain" name="customDomain" defaultValue={snapshot.profile?.customDomain ?? ""} placeholder="service.yourdomain.com" />
            </div>
          </div>

          <Button type="submit">
            Save business details
          </Button>
        </form>

        <form className="surface form-grid space-y-4" action="/api/tenant/settings/profile" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Branding</div>
            <h2 style={{ marginBottom: 8 }}>Customer-facing colour system</h2>
            <p>Applied to your quote, agreement, invoice, and all other customer-facing pages.</p>
          </div>

          <Input type="hidden" name="businessName" value={snapshot.profile?.businessName ?? ""} />
          <Input type="hidden" name="tagline" value={snapshot.profile?.tagline ?? ""} />
          <Input type="hidden" name="phone" value={snapshot.profile?.phone ?? ""} />
          <Input type="hidden" name="email" value={snapshot.profile?.email ?? ""} />
          <Input type="hidden" name="businessType" value={snapshot.profile?.businessType ?? "other"} />
          <Input type="hidden" name="suburb" value={snapshot.profile?.suburb ?? ""} />
          <Input type="hidden" name="postcode" value={snapshot.profile?.postcode ?? ""} />
          <Input type="hidden" name="serviceAreaSuburbs" value={snapshot.profile?.serviceAreaSuburbs.join(", ") ?? ""} />
          <Input type="hidden" name="customDomain" value={snapshot.profile?.customDomain ?? ""} />

          <div className="setup-field-grid">
            <div className="space-y-4">
              <Label htmlFor="primaryColour">Primary colour</Label>
              <Input id="primaryColour" name="primaryColour" type="color" defaultValue={snapshot.profile?.primaryColour ?? "#2D5016"} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="secondaryColour">Secondary colour</Label>
              <Input id="secondaryColour" name="secondaryColour" type="color" defaultValue={snapshot.profile?.secondaryColour ?? "#1F2937"} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="accentColour">Accent colour</Label>
              <Input id="accentColour" name="accentColour" type="color" defaultValue={snapshot.profile?.accentColour ?? "#84CC16"} />
            </div>
          </div>

          <div className="setup-row-actions" style={{ justifyContent: "flex-start" }}>
            <Button type="submit">
              Save branding
            </Button>
          </div>
        </form>
      </div>

      <div className="cards-2 gap-4">
        <div className="surface setup-section">
          <div className="setup-section-copy">
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
                    <Input type="hidden" name="_method" value="DELETE" />
                    <Button variant="ghost" type="submit" style={{ fontSize: 12 }}>Remove</Button>
                  </form>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No service templates saved yet.</p>}
          </div>

          <form action="/api/tenant/settings/services" method="post" className="space-y-4" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end" }} className="gap-4">
              <div className="space-y-4" style={{ flex: "2 1 160px" }}>
                <Label htmlFor="serviceTemplateName">Service name</Label>
                <Input id="serviceTemplateName" name="name" placeholder="e.g. Lawn mow — standard block" required />
              </div>
              <div className="space-y-4" style={{ flex: "1 1 90px" }}>
                <Label htmlFor="serviceTemplatePrice">Price ($)</Label>
                <Input id="serviceTemplatePrice" name="defaultPrice" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-4" style={{ flex: "1 1 90px" }}>
                <Label htmlFor="serviceTemplateDuration">Duration (mins)</Label>
                <Input id="serviceTemplateDuration" name="defaultDuration" type="number" min="0" step="5" placeholder="60" />
              </div>
              <Button variant="ghost" type="submit">Add template</Button>
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
