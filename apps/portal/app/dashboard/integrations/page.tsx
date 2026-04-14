import { getTenantIntegrationRecord, getTenantIntegrations } from "@flowlab/db";
import { automationBlueprints, serviceLabels } from "@flowlab/contracts";
import { decryptJson, integrationFieldDefinitions, integrationHelpText } from "@flowlab/integrations";

import DashboardPageHeader from "../../../components/dashboard-page-header";
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
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Connect the tools your business needs without turning setup into a scavenger hunt."
        description="Core services live here with clear status, save, and test actions. Make stays in its own advanced area so routine setup stays easy to scan."
        section="setup"
      />

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Core integrations</div>
            <div className="setup-summary-value">{visibleIntegrations.length}</div>
            <p className="setup-summary-copy">Xero, messaging, documents, routing, and AI setup all live in one place.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Make setup</div>
            <div className="setup-summary-value">{configuredMakeWebhookCount}</div>
            <p className="setup-summary-copy">
              of {automationBlueprints.length} webhook{automationBlueprints.length === 1 ? "" : "s"} are configured for optional external orchestration.
            </p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Operator guidance</div>
            <div className="setup-summary-value">2</div>
            <p className="setup-summary-copy">Use Automations for day-to-day switches. Use Integrations for credentials, OAuth, and connection checks.</p>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-copy">
          <div className="eyebrow">Core tools</div>
          <h2>Handle the services that keep jobs moving and invoices flowing</h2>
          <p>Each integration shows its current status first, then gives you the smallest possible setup action set: save credentials, reconnect if needed, and run a quick check.</p>
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
              <div key={integration.id} className="surface-soft" style={{ display: "grid", gap: 16 }}>
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${statusClass}`}>{integration.status.replace(/_/g, " ")}</span>
                    <span>{serviceLabels[integration.service]}</span>
                    <span>Last tested: {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : "Never"}</span>
                  </div>
                  <h3>{serviceLabels[integration.service]}</h3>
                  <p>{integrationHelpText[integration.service]}</p>
                </div>

                {isExpiringSoon ? (
                  <p className="setup-note" style={{ color: "#fbbf24" }}>
                    This connection expires {daysUntilExpiry! <= 0 ? "today" : `in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`}. Reconnect it before your operator notices.
                  </p>
                ) : null}

                {integration.lastErrorMessage ? (
                  <p className="setup-note" style={{ color: "#fca5a5" }}>
                    {integration.lastErrorMessage}
                  </p>
                ) : null}

                {isXero ? (
                  <div className="stack" style={{ gap: 14 }}>
                    <p className="setup-note">Xero uses OAuth. Save the client credentials first, then connect your Xero organisation.</p>
                    <form action="/api/tenant/integrations/xero/save" method="post" className="form-grid">
                      {integrationFieldDefinitions.xero.map((field) => (
                        <label className="label" key={field.name}>
                          {field.label}
                          <input className="input" name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} />
                        </label>
                      ))}
                      <button className="ghost" type="submit">Save credentials</button>
                    </form>
                    <a href="/api/tenant/integrations/xero" className="cta" style={{ display: "inline-flex", width: "fit-content" }}>
                      {integration.status === "connected" ? "Reconnect your business Xero" : "Connect your business Xero"}
                    </a>
                  </div>
                ) : integrationFieldDefinitions[integration.service].length > 0 ? (
                  <div className="stack" style={{ gap: 14 }}>
                    <form action={`/api/tenant/integrations/${integration.service}/save`} method="post" className="form-grid">
                      {integrationFieldDefinitions[integration.service].map((field) => (
                        <label className="label" key={field.name}>
                          {field.label}
                          <input className="input" name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} />
                        </label>
                      ))}
                      <button className="cta" type="submit">Save credentials</button>
                    </form>

                    <form action={`/api/tenant/integrations/${integration.service}/test`} method="post" className="form-grid">
                      <input type="hidden" name="service" value={integration.service} />
                      <input type="hidden" name="tenantId" value={session.tenantId} />
                      <label className="label">
                        Optional one-off test value
                        <input className="input" name="credentialValue" placeholder="Leave blank to use saved credentials" />
                      </label>
                      <button className="ghost" type="submit">Test connection</button>
                    </form>
                  </div>
                ) : (
                  <p className="setup-note">Managed by FlowLab. There’s nothing the tenant needs to configure here.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {makeIntegration ? (
        <div className="surface setup-section">
          <div className="setup-section-header">
            <div className="setup-section-copy">
              <div className="eyebrow">Advanced automation</div>
              <h2>Keep Make.com optional and explicit</h2>
              <p>Import only the scenarios you actually want, then paste the generated webhook URLs into the matching rows below. Blank fields keep any saved URLs in place.</p>
            </div>
            <div className="setup-row-actions">
              <a className="ghost" href="/dashboard/automations">Open automations</a>
              <a className="cta" href="/api/tenant/blueprints/download">Download blueprint ZIP</a>
            </div>
          </div>

          <div className="setup-row" style={{ paddingTop: 0, borderTop: 0 }}>
            <div className="setup-row-main">
              <div className="setup-row-meta">
                <span className={`status-pill ${makeIntegration.status === "connected" ? "is-on" : "is-off"}`}>
                  {makeIntegration.status === "not_configured" ? "Optional" : makeIntegration.status.replace(/_/g, " ")}
                </span>
                <span>{configuredMakeWebhookCount}/{automationBlueprints.length} configured</span>
                <span>Last tested: {makeIntegration.lastTestedAt ? new Date(makeIntegration.lastTestedAt).toLocaleString() : "Never"}</span>
              </div>
              <h3>Make.com</h3>
              <p>FlowLab keeps running without Make. This section is only for teams that want CRM, scheduling, or billing events to fan out into Slack, Airtable, Sheets, Notion, or other external tools.</p>
            </div>
            <div className="setup-row-actions">
              <form action="/api/tenant/integrations/make_com/test" method="post" className="setup-row-actions">
                <input type="hidden" name="service" value="make_com" />
                <input type="hidden" name="tenantId" value={session.tenantId} />
                <button className="ghost" type="submit">Check saved setup</button>
              </form>
            </div>
          </div>

          <form action="/api/tenant/integrations/make_com/save" method="post" className="setup-scenario-grid">
            {automationBlueprints.map((descriptor) => {
              const hasSavedValue =
                typeof savedMakeCredentials?.[descriptor.webhookKey] === "string" &&
                savedMakeCredentials[descriptor.webhookKey].trim().length > 0;

              return (
                <div key={descriptor.webhookKey} className="setup-scenario-row">
                  <div className="setup-row-main">
                    <div className="setup-row-meta">
                      <span className={`status-pill ${hasSavedValue ? "is-on" : "is-off"}`}>{hasSavedValue ? "Configured" : "Not configured"}</span>
                    </div>
                    <h3>{descriptor.title}</h3>
                    <p>{descriptor.description}</p>
                  </div>
                  <div className="setup-scenario-input">
                    <label htmlFor={descriptor.webhookKey}>Webhook URL</label>
                    <input
                      id={descriptor.webhookKey}
                      className="input"
                      name={descriptor.webhookKey}
                      type="url"
                      placeholder={hasSavedValue ? "Saved already — paste a new URL only if you want to replace it" : "https://hook.make.com/..."}
                    />
                  </div>
                </div>
              );
            })}

            <div className="setup-row" style={{ paddingBottom: 0 }}>
              <p className="setup-note">FlowLab stores these webhook URLs encrypted. Save once, then use the connection check when you want a quick sanity pass.</p>
              <div className="setup-row-actions">
                <button className="cta" type="submit">Save Make webhook URLs</button>
              </div>
            </div>
          </form>

          <form action="/api/tenant/integrations/make_com/test" method="post" className="surface-soft form-grid">
            <input type="hidden" name="service" value="make_com" />
            <input type="hidden" name="tenantId" value={session.tenantId} />
            <div>
              <div className="eyebrow">Connection check</div>
              <h3 style={{ marginTop: 6, marginBottom: 8 }}>Validate the current Make setup</h3>
              <p className="setup-note">Leave the field blank to validate the saved webhook set, or paste a single webhook URL to sanity-check one new scenario before you save it.</p>
            </div>
            <label className="label">
              Optional single webhook URL
              <input className="input" name="credentialValue" placeholder="Leave blank to use saved credentials" />
            </label>
            <button className="ghost" type="submit">Check Make setup</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
