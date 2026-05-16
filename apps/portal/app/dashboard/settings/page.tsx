import { getPricingModel, tradePresetOptions } from "@flowlab/contracts";
import { getPendingRateSuggestions, getTenantSettingsSnapshot } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../components/submit-button";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { requireTenantSession } from "../../../lib/session";
import CustomDomainSection from "./CustomDomainSection";
import RateSuggestionsPanel from "./RateSuggestionsPanel";
import ServiceAreaMapEditor from "./ServiceAreaMapEditor";
import ServiceTemplateSuggestions from "./ServiceTemplateSuggestions";

const groupLabels: Record<string, string> = {
  home_services: "Home services",
  outdoor_property: "Outdoor/property",
  cleaning_compliance: "Cleaning/compliance",
  mobile_other: "Mobile/other"
};

const groupedTrades = tradePresetOptions.reduce<Record<string, typeof tradePresetOptions>>((groups, option) => {
  groups[option.group] = [...(groups[option.group] ?? []), option];
  return groups;
}, {});

function getPricingModelLabel(model: ReturnType<typeof getPricingModel>) {
  switch (model) {
    case "area_based":
      return "Area based";
    case "hourly":
      return "Hourly";
    case "callout_plus_hourly":
      return "Call-out + hourly";
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
  const params = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;
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
        description="Review the editable defaults FlowLab set up during onboarding: business details, service area, pricing, services, and booking details."
        section="setup"
      >

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="eyebrow">Business basics</div>
        <h2 style={{ marginBottom: 8 }}>Your business details</h2>
        <p className="text-sm text-muted-foreground">These were pre-filled during onboarding. Update them as your business grows or your pricing evolves.</p>
      </div>

      {params.branding === "saved" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p style={{ color: "#86efac" }}>Branding colours saved — customer-facing pages will reflect the update.</p>
        </div>
      ) : null}


      <div className="cards-2 gap-4">
        <form className="surface form-grid space-y-4" action="/api/tenant/settings/profile" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Business details</div>
            <h2 style={{ marginBottom: 8 }}>Business name, phone, and service area</h2>
            <p>Core details used on your booking page, quotes, and communications.</p>
          </div>

          <div className="setup-field-grid">
            <div className="space-y-4">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" defaultValue={snapshot.profile?.businessName ?? ""} required />
            </div>
            <div className="space-y-4">
              <Label htmlFor="tagline">Tagline <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>shown on your booking page header</span></Label>
              <Input id="tagline" name="tagline" defaultValue={snapshot.profile?.tagline ?? ""} placeholder="e.g. Fast, reliable lawn care across Brisbane" title="Displayed under your business name on the public booking and quote pages" />
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
                {Object.entries(groupedTrades).map(([group, options]) => (
                  <optgroup key={group} label={groupLabels[group] ?? group}>
                    {options.map((option) => (
                      <option key={option.businessType} value={option.businessType}>{option.label}</option>
                    ))}
                  </optgroup>
                ))}
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
            <ServiceAreaMapEditor
              initialAddress={snapshot.profile?.serviceBaseAddress ?? ""}
              initialPlaceId={snapshot.profile?.serviceBasePlaceId ?? ""}
              initialLat={snapshot.profile?.serviceBaseLat ?? null}
              initialLng={snapshot.profile?.serviceBaseLng ?? null}
              initialRadiusKm={snapshot.profile?.serviceRadiusKm ?? null}
              initialSuburbs={snapshot.profile?.serviceAreaSuburbs ?? []}
            />
            <div className="space-y-4 is-full">
              <Label htmlFor="customDomain">Custom domain <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>optional</span></Label>
              <Input id="customDomain" name="customDomain" defaultValue={snapshot.profile?.customDomain ?? ""} placeholder="service.yourdomain.com" title="Point a subdomain of your own domain here and your booking page will serve from it. Leave blank to use the default FlowLab subdomain." />
            </div>
          </div>

          <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Save business details
          </SubmitButton>
        </form>

        <form className="surface form-grid space-y-4" action="/api/tenant/settings/branding" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Branding</div>
            <h2 style={{ marginBottom: 8 }}>Customer-facing colour system</h2>
            <p>Applied to your quote, agreement, invoice, and all other customer-facing pages.</p>
          </div>

          <div className="setup-field-grid">
            <div className="space-y-4">
              <Label htmlFor="primaryColour">Primary colour</Label>
              <Input id="primaryColour" name="primaryColour" type="color" defaultValue={snapshot.profile?.primaryColour ?? "#2D5016"} title="Main brand colour — used for headings and primary buttons on customer-facing pages" />
            </div>
            <div className="space-y-4">
              <Label htmlFor="secondaryColour">Secondary colour</Label>
              <Input id="secondaryColour" name="secondaryColour" type="color" defaultValue={snapshot.profile?.secondaryColour ?? "#1F2937"} title="Background or dark accent colour used on customer-facing documents" />
            </div>
            <div className="space-y-4">
              <Label htmlFor="accentColour">Accent colour</Label>
              <Input id="accentColour" name="accentColour" type="color" defaultValue={snapshot.profile?.accentColour ?? "#84CC16"} title="Highlight colour for badges, links, and call-to-action elements" />
            </div>
          </div>

          <div className="setup-row-actions" style={{ justifyContent: "flex-start" }}>
            <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Save branding
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="cards-2 gap-4">
        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Pricing rates</div>
            <h2 style={{ marginBottom: 8 }}>Current pricing configuration</h2>
            <p>Your pricing model and configured rates. These guide quote drafts and margin suggestions. To change rates, contact support or update directly in your database settings.</p>
          </div>

          <div className="space-y-3">
            {snapshot.pricingRates.length > 0 ? snapshot.pricingRates.map((rate) => {
              const summary =
                pricingModel === "area_based"
                  ? `$${rate.baseRatePerSquareM ?? "—"}/m² · Overgrown $${rate.overgrownRate ?? "—"}/m² · Minimum $${rate.minimumCharge ?? "—"}`
                  : pricingModel === "hourly"
                    ? `$${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`
                    : pricingModel === "callout_plus_hourly"
                      ? `Call-out $${rate.calloutFee ?? "—"} · $${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`
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

          {params.rates === "analysed" ? (
            <div className="border-l-4 pl-4 border-l-emerald-500" style={{ padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#86efac" }}>
              Rate analysis complete — see suggestions below.
            </div>
          ) : params.rates === "insufficient" ? (
            <div className="border-l-4 pl-4 border-l-amber-500" style={{ padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#fde68a" }}>
              Not enough job history yet — complete at least 5 jobs to run a rate analysis.
            </div>
          ) : null}

          <form action="/api/tenant/settings/rate-analysis" method="post">
            <SubmitButton
              className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
              loadingText="Analysing…"
              title="FlowLab reviews your last 30 jobs, compares actual vs estimated hours, and suggests rate adjustments using Claude."
            >
              Analyse my rates
            </SubmitButton>
          </form>

          <p className="text-sm text-muted-foreground">Service templates speed up quoting by pre-filling common services and durations. Add them below.</p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Service templates</div>
            <h2 style={{ marginBottom: 8 }}>Speed up quoting with service templates</h2>
            <p>Pre-define your common services (e.g. &ldquo;Lawn mow: $85, 45 mins&rdquo;). FlowLab suggests them when drafting quotes — you can always override.</p>
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
                  <p>${service.defaultPrice ?? 0} per job · {service.defaultDuration ?? 0} min estimated duration</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <form action={`/api/tenant/settings/services?id=${service.id}`} method="post">
                    <Input type="hidden" name="_method" value="DELETE" />
                    <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground" loadingText="Removing...">Remove</SubmitButton>
                  </form>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No service templates saved yet.</p>}
          </div>

          <ServiceTemplateSuggestions />

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
              <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" loadingText="Adding...">Add template</SubmitButton>
            </div>
          </form>
        </div>
      </div>

      {rateSuggestions.length > 0 ? (
        <RateSuggestionsPanel suggestions={rateSuggestions} />
      ) : null}

      {params.signature === "saved" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p style={{ color: "#86efac" }}>Email signature settings saved.</p>
        </div>
      ) : null}

      <form className="surface form-grid space-y-4" action="/api/tenant/settings/signature" method="post">
        <div className="setup-section-copy">
          <div className="eyebrow">Email signature</div>
          <h2 style={{ marginBottom: 8 }}>Outgoing email signature</h2>
          <p>FlowLab automatically builds your email signature from your business profile — name, phone, email, address, and ABN. Control when it appears and optionally replace it with your own HTML.</p>
        </div>

        <div className="setup-field-grid">
          <div className="space-y-4 is-full">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="hidden"
                  name="emailSignatureEnabled"
                  value="0"
                />
                <input
                  type="checkbox"
                  name="emailSignatureEnabled"
                  value="1"
                  defaultChecked={snapshot.profile?.emailSignatureEnabled ?? true}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  <strong style={{ display: "block", fontSize: 14 }}>Include in automated emails</strong>
                  <span className="text-sm text-muted-foreground">Appended to all system-triggered emails — booking confirmations, invoices, reminders, and so on.</span>
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="hidden"
                  name="emailSignatureAdHocDefault"
                  value="0"
                />
                <input
                  type="checkbox"
                  name="emailSignatureAdHocDefault"
                  value="1"
                  defaultChecked={snapshot.profile?.emailSignatureAdHocDefault ?? true}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  <strong style={{ display: "block", fontSize: 14 }}>Include by default in ad-hoc messages</strong>
                  <span className="text-sm text-muted-foreground">Pre-ticks the &ldquo;Include signature&rdquo; checkbox when you send a manual message from the CRM, job, or invoice screen. You can override it per-send.</span>
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4 is-full">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label htmlFor="emailSignatureCustomHtml">
                Custom signature HTML <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>optional — overrides the auto-generated one</span>
              </Label>
              <textarea
                id="emailSignatureCustomHtml"
                name="emailSignatureCustomHtml"
                rows={6}
                defaultValue={snapshot.profile?.emailSignatureCustomHtml ?? ""}
                placeholder={"Leave blank to use the auto-generated signature built from your business profile.\n\nOr enter custom HTML here, e.g.:\n<strong>Jane Smith</strong><br>0400 000 000 · jane@example.com"}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
              <p className="text-sm text-muted-foreground">
                When filled in, this replaces the auto-generated block entirely. Basic HTML is supported. The signature content is only rendered inside outgoing emails — not in the browser.
              </p>
            </div>
          </div>

          {snapshot.profile && (
            <div className="space-y-4 is-full">
              <Label>Signature preview <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>auto-generated from your profile</span></Label>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
                <table cellPadding={0} cellSpacing={0} style={{ borderTop: `2px solid ${snapshot.profile.primaryColour ?? "#3B82F6"}`, paddingTop: 12, marginTop: 0, width: "100%" }}>
                  <tbody>
                    <tr>
                      {snapshot.profile.logoUrl ? (
                        <td style={{ paddingRight: 16, verticalAlign: "middle" }}>
                          <img src={snapshot.profile.logoUrl} alt={snapshot.profile.businessName} style={{ maxHeight: 40, width: "auto", display: "block" }} />
                        </td>
                      ) : null}
                      <td style={{ verticalAlign: "middle" }}>
                        <strong style={{ color: "#0f172a", fontSize: 14, display: "block" }}>{snapshot.profile.businessName}</strong>
                        {(snapshot.profile.phone || snapshot.profile.email) ? (
                          <span style={{ fontSize: 13, color: "#64748b" }}>
                            {[snapshot.profile.phone, snapshot.profile.email].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                        {[snapshot.profile.address, snapshot.profile.suburb, snapshot.profile.state, snapshot.profile.postcode].some(Boolean) ? (
                          <><br /><span style={{ fontSize: 12, color: "#94a3b8" }}>{[snapshot.profile.address, snapshot.profile.suburb, snapshot.profile.state, snapshot.profile.postcode].filter(Boolean).join(", ")}</span></>
                        ) : null}
                        {snapshot.profile.abn ? (
                          <><br /><span style={{ fontSize: 12, color: "#94a3b8" }}>ABN {snapshot.profile.abn}</span></>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">Update phone, email, address, or ABN in the Business details section above and the signature will reflect the change automatically.</p>
            </div>
          )}
        </div>

        <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Save signature settings
        </SubmitButton>
      </form>

      <CustomDomainSection
        currentDomain={snapshot.profile?.customDomain ?? null}
        isVerified={snapshot.profile?.customDomainVerified ?? false}
        tenantSlug={snapshot.tenant?.slug ?? ""}
      />
    </DashboardPageScaffold>
  );
}
