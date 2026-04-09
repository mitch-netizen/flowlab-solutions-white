import { getTenantIntegrations } from "@flowlab/db";
import { serviceLabels } from "@flowlab/contracts";
import { integrationFieldDefinitions, integrationHelpText } from "@flowlab/integrations";

import { requireTenantSession } from "../../../lib/session";

export default async function IntegrationsPage() {
  const session = await requireTenantSession();
  const integrations = await getTenantIntegrations(session.tenantId);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Integrations hub</div>
        <h1>Connect your business services.</h1>
        <p style={{ color: "#cbd5e1" }}>
          These are your business integrations — separate from FlowLab's own platform connections. Credentials are encrypted at rest and every test attempt feeds the event log and health dashboard.
        </p>
      </div>
      <div className="cards-2">
        {integrations.map((integration) => {
          const isXero = integration.service === "xero";
          const expiresAt = integration.oauthExpiresAt ? new Date(integration.oauthExpiresAt) : null;
          const daysUntilExpiry = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 7;

          return (
            <div key={integration.id} className="surface">
              <div className="eyebrow">{serviceLabels[integration.service]}</div>
              <h2 style={{ marginBottom: 8 }}>{serviceLabels[integration.service]}</h2>
              <p style={{ color: "#cbd5e1", minHeight: 70 }}>{integrationHelpText[integration.service]}</p>

              <div style={{ marginBottom: 8 }}>
                Status:{" "}
                <span style={{
                  color: integration.status === "connected" ? "#16a34a" : integration.status === "error" ? "#dc2626" : "#94a3b8",
                  fontWeight: 600
                }}>
                  {integration.status}
                </span>
              </div>

              {isExpiringSoon ? (
                <div style={{ marginBottom: 12, color: "#fbbf24", fontWeight: 600 }}>
                  ⚠ Your {serviceLabels[integration.service]} connection expires {daysUntilExpiry! <= 0 ? "today" : `in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`} — reconnect to keep automations running.
                </div>
              ) : null}

              {integration.lastErrorMessage ? (
                <div style={{ marginBottom: 12, color: "#fca5a5", fontSize: 14 }}>
                  {integration.lastErrorMessage}
                </div>
              ) : null}

              <div style={{ color: "#94a3b8", marginBottom: 14, fontSize: 14 }}>
                Last tested: {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : "Never"}
              </div>

              {integration.service === "make_com" && (
                <div className="surface-soft" style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, color: "#cbd5e1" }}>
                    Download the full Make.com blueprint pack, import the JSON templates, then paste each generated webhook URL back here.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <a className="ghost" href="/api/tenant/blueprints/download">
                      Download blueprint ZIP
                    </a>
                  </div>
                </div>
              )}

              {isXero ? (
                <div>
                  <div className="surface-soft" style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 8px 0", color: "#cbd5e1", fontSize: 14 }}>
                      Xero uses OAuth — enter your Xero Client ID and Secret below, then click Connect to authorise access to your Xero organisation.
                    </p>
                  </div>
                  <form action="/api/tenant/integrations/xero/save" method="post" className="form-grid" style={{ marginBottom: 12 }}>
                    {integrationFieldDefinitions.xero.map((field) => (
                      <label className="label" key={field.name}>
                        {field.label}
                        <input className="input" name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} />
                      </label>
                    ))}
                    <button className="ghost" type="submit">
                      Save credentials
                    </button>
                  </form>
                  <a href="/api/tenant/integrations/xero" className="cta" style={{ display: "inline-block" }}>
                    {integration.status === "connected" ? "Reconnect your business Xero" : "Connect your business Xero"}
                  </a>
                </div>
              ) : integrationFieldDefinitions[integration.service].length > 0 ? (
                <form action={`/api/tenant/integrations/${integration.service}/save`} method="post" className="form-grid">
                  {integrationFieldDefinitions[integration.service].map((field) => (
                    <label className="label" key={field.name}>
                      {field.label}
                      <input className="input" name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} />
                    </label>
                  ))}
                  <button className="cta" type="submit">
                    Save credentials
                  </button>
                </form>
              ) : (
                <div className="surface-soft" style={{ marginBottom: 16 }}>
                  Managed by FlowLab — no setup needed on your end.
                </div>
              )}

              {!isXero && (
                <form action={`/api/tenant/integrations/${integration.service}/test`} method="post" className="form-grid" style={{ marginTop: 16 }}>
                  <input type="hidden" name="service" value={integration.service} />
                  <input type="hidden" name="tenantId" value={session.tenantId} />
                  <label className="label">
                    Optional one-off test value
                    <input className="input" name="credentialValue" placeholder="Leave blank to use saved credentials" />
                  </label>
                  <button className="ghost" type="submit">
                    Test connection
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
