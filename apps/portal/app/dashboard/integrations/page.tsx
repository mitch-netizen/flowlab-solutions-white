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
        <h1>Connect each tenant-owned service from one place.</h1>
        <p style={{ color: "#cbd5e1" }}>Credentials are encrypted at rest and every test attempt feeds the event log and health dashboard.</p>
      </div>
      <div className="cards-2">
        {integrations.map((integration) => (
          <div key={integration.id} className="surface">
            <div className="eyebrow">{serviceLabels[integration.service]}</div>
            <h2 style={{ marginBottom: 8 }}>{serviceLabels[integration.service]}</h2>
            <p style={{ color: "#cbd5e1", minHeight: 70 }}>{integrationHelpText[integration.service]}</p>
            <div style={{ marginBottom: 14 }}>Status: {integration.status}</div>
            <div style={{ color: "#cbd5e1", marginBottom: 14 }}>Last tested: {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : "Never"}</div>
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
            {integrationFieldDefinitions[integration.service].length > 0 ? (
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
                FlowLab manages this service for the tenant. No credential entry is required here.
              </div>
            )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
