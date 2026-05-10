import { getTenantIntegrationRecord, getTenantIntegrations } from "@flowlab/db";
import { automationBlueprints, serviceLabels } from "@flowlab/contracts";
import { decryptJson, integrationFieldDefinitions, integrationHelpText } from "@flowlab/integrations";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";

export default async function IntegrationsPage() {
  const session = await requireTenantSession();
  const [integrations, makeRecord] = await Promise.all([
    getTenantIntegrations(session.tenantId),
    getTenantIntegrationRecord(session.tenantId, "make_com")
  ]);

  const visibleIntegrations = integrations.filter(
    (integration) => integration.service !== "stripe" && integration.service !== "make_com"
  );
  const makeIntegration = integrations.find((integration) => integration.service === "make_com") ?? null;
  const savedMakeCredentials = makeRecord?.credentialsJson ? decryptJson(makeRecord.credentialsJson) : null;
  const configuredMakeWebhookCount = automationBlueprints.filter((descriptor) => {
    const value = savedMakeCredentials?.[descriptor.webhookKey];
    return typeof value === "string" && value.trim().length > 0;
  }).length;

  return (
    
      <DashboardPageScaffold
        eyebrow="Setup"
        title="Integrations"
        description="Connect and manage the external services your business relies on. Core integrations are listed first — Make.com is in the advanced section below."
        section="setup"
      >

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Core integrations</div>
            <div className="text-3xl font-semibold">{visibleIntegrations.length}</div>
            <p className="text-sm text-muted-foreground">Xero, messaging, documents, and AI all configured here.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Make setup</div>
            <div className="text-3xl font-semibold">{configuredMakeWebhookCount}</div>
            <p className="text-sm text-muted-foreground">
              of {automationBlueprints.length} webhook{automationBlueprints.length === 1 ? "" : "s"} are configured for optional external orchestration.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Quick tip</div>
            <div className="text-3xl font-semibold">0</div>
            <p className="text-sm text-muted-foreground">Most core providers are managed by FlowLab, so operators do not need API keys to get started.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Core tools</div>
          <h2>Core integrations</h2>
          <p>Each integration shows its current status. Save credentials, reconnect if needed, and run a connection check from here.</p>
        </div>

        <div className="cards-2">
          {visibleIntegrations.map((integration) => {
            const isXero = integration.service === "xero";
            const expiresAt = integration.oauthExpiresAt ? new Date(integration.oauthExpiresAt) : null;
            const daysUntilExpiry = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 7;
            const statusClass =
              integration.status === "connected"
                ? "is-on"
                : integration.status === "error"
                  ? "is-warning"
                  : "is-off";

            return (
              <div key={integration.id} className="rounded-lg border bg-card/60 p-4" style={{ display: "grid", gap: 16 }}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${statusClass}`}>{integration.status.replace(/_/g, " ")}</span>
                    <span>{serviceLabels[integration.service]}</span>
                    <span>Last tested: {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : "Never"}</span>
                  </div>
                  <h3>{serviceLabels[integration.service]}</h3>
                  <p>{integrationHelpText[integration.service]}</p>
                  <p className="text-sm text-muted-foreground">
                    {integration.managementMode === "platform_managed"
                      ? `Managed by FlowLab. Usage this month: ${integration.usageThisMonth ?? 0}.`
                      : integration.managementMode === "connected_account"
                        ? "Connect your account once; FlowLab manages the app credentials."
                        : integration.managementMode === "advanced_optional"
                          ? "Advanced optional workflow."
                          : "Tenant-managed credentials override FlowLab defaults."}
                  </p>
                </div>

                {isExpiringSoon ? (
                  <p className="text-sm text-muted-foreground" style={{ color: "#fbbf24" }}>
                    This connection expires {daysUntilExpiry! <= 0 ? "today" : `in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`}. Reconnect it to avoid any disruption.
                  </p>
                ) : null}

                {integration.lastErrorMessage ? (
                  <p className="text-sm text-muted-foreground" style={{ color: "#fca5a5" }}>
                    {integration.lastErrorMessage}
                  </p>
                ) : null}

                {isXero ? (
                  <div className="stack" style={{ gap: 14 }}>
                    <p className="text-sm text-muted-foreground">Xero uses a FlowLab-managed OAuth app. Connect your Xero organisation; no client ID or secret is needed.</p>
                    <a href="/api/tenant/integrations/xero" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" style={{ display: "inline-flex", width: "fit-content" }}>
                      {integration.status === "connected" ? "Reconnect your business Xero" : "Connect your business Xero"}
                    </a>
                  </div>
                ) : integration.managementMode === "platform_managed" ? (
                  <div className="stack" style={{ gap: 14 }}>
                    <p className="text-sm text-muted-foreground">Managed automatically through FlowLab-owned credentials. Advanced tenant-owned credentials can be added later if this business needs a dedicated provider account.</p>
                    <form action={`/api/tenant/integrations/${integration.service}/test`} method="post" className="space-y-4">
                      <input type="hidden" name="service" value={integration.service} />
                      <input type="hidden" name="tenantId" value={session.tenantId} />
                      <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Check managed connection</button>
                    </form>
                  </div>
                ) : integrationFieldDefinitions[integration.service].length > 0 ? (
                  <div className="stack" style={{ gap: 14 }}>
                    <form action={`/api/tenant/integrations/${integration.service}/save`} method="post" className="space-y-4">
                      {integrationFieldDefinitions[integration.service].map((field) => (
                        <label className="flex flex-col gap-2 text-sm text-muted-foreground" key={field.name}>
                          {field.label}
                          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} />
                        </label>
                      ))}
                      <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Save credentials</button>
                    </form>

                    <form action={`/api/tenant/integrations/${integration.service}/test`} method="post" className="space-y-4">
                      <input type="hidden" name="service" value={integration.service} />
                      <input type="hidden" name="tenantId" value={session.tenantId} />
                      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                        Optional one-off test value
                        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="credentialValue" placeholder="Leave blank to use saved credentials" />
                      </label>
                      <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Test connection</button>
                    </form>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Managed automatically — no configuration required.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {makeIntegration ? (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Advanced automation</div>
              <h2>Keep Make.com optional and explicit</h2>
              <p>Import only the scenarios you actually want, then paste the generated webhook URLs into the matching rows below. Blank fields keep any saved URLs in place.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/automations">Open automations</a>
              <a className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/api/tenant/blueprints/download">Download blueprint ZIP</a>
            </div>
          </div>

          <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]" style={{ paddingTop: 0, borderTop: 0 }}>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className={`status-pill ${makeIntegration.status === "connected" ? "is-on" : "is-off"}`}>
                  {makeIntegration.status === "not_configured" ? "Optional" : makeIntegration.status.replace(/_/g, " ")}
                </span>
                <span>{configuredMakeWebhookCount}/{automationBlueprints.length} configured</span>
                <span>Last tested: {makeIntegration.lastTestedAt ? new Date(makeIntegration.lastTestedAt).toLocaleString() : "Never"}</span>
              </div>
              <h3>Make.com</h3>
              <p>This section is optional. Enable it only if you want CRM, scheduling, or billing events to flow into external tools like Slack, Airtable, Sheets, or Notion.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <form action="/api/tenant/integrations/make_com/test" method="post" className="flex flex-wrap items-center justify-end gap-2">
                <input type="hidden" name="service" value="make_com" />
                <input type="hidden" name="tenantId" value={session.tenantId} />
                <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Check saved setup</button>
              </form>
            </div>
          </div>

          <form action="/api/tenant/integrations/make_com/save" method="post" className="space-y-3">
            {automationBlueprints.map((descriptor) => {
              const hasSavedValue =
                typeof savedMakeCredentials?.[descriptor.webhookKey] === "string" &&
                savedMakeCredentials[descriptor.webhookKey].trim().length > 0;

              return (
                <div key={descriptor.webhookKey} className="grid gap-4 rounded-lg border bg-card/40 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className={`status-pill ${hasSavedValue ? "is-on" : "is-off"}`}>{hasSavedValue ? "Configured" : "Not configured"}</span>
                    </div>
                    <h3>{descriptor.title}</h3>
                    <p>{descriptor.description}</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={descriptor.webhookKey}>Webhook URL</label>
                    <input
                      id={descriptor.webhookKey}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      name={descriptor.webhookKey}
                      type="url"
                      placeholder={hasSavedValue ? "Saved already — paste a new URL only if you want to replace it" : "https://hook.make.com/..."}
                    />
                  </div>
                </div>
              );
            })}

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]" style={{ paddingBottom: 0 }}>
              <p className="text-sm text-muted-foreground">Webhook URLs are stored encrypted. Save once, then use the connection check below to verify the setup at any time.</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Save Make webhook URLs</button>
              </div>
            </div>
          </form>

          <form action="/api/tenant/integrations/make_com/test" method="post" className="rounded-lg border bg-card/60 p-4 space-y-4">
            <input type="hidden" name="service" value="make_com" />
            <input type="hidden" name="tenantId" value={session.tenantId} />
            <div>
              <div className="eyebrow">Connection check</div>
              <h3 style={{ marginTop: 6, marginBottom: 8 }}>Validate the current Make setup</h3>
              <p className="text-sm text-muted-foreground">Leave the field blank to validate the saved webhook set, or paste a single webhook URL to sanity-check one new scenario before you save it.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Optional single webhook URL
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="credentialValue" placeholder="Leave blank to use saved credentials" />
            </label>
            <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Check Make setup</button>
          </form>
        </div>
      ) : null}
    </DashboardPageScaffold>
  );
}
