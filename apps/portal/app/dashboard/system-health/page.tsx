import { getTenantEvents, getTenantIntegrations } from "@flowlab/db";
import { getServiceLabel, serviceLabels } from "@flowlab/contracts";

import { requireTenantSession } from "../../../lib/session";

export default async function SystemHealthPage() {
  const session = await requireTenantSession();
  const [events, integrations] = await Promise.all([
    getTenantEvents(session.tenantId),
    getTenantIntegrations(session.tenantId)
  ]);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">System health</div>
        <h1>Everything working as it should?</h1>
        <p style={{ color: "#cbd5e1" }}>Check the status of your connected services and review recent activity across your account — SMS, email, payments, and more.</p>
      </div>
      <div className="cards-3">
        {integrations.map((integration) => (
          <div key={integration.id} className="surface-soft">
            <strong>{serviceLabels[integration.service]}</strong>
            <div style={{ marginTop: 10, color: "#cbd5e1" }}>{integration.status}</div>
          </div>
        ))}
      </div>
      <div className="surface">
        <h2>Live event log</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Service</th>
              <th>Status</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{getServiceLabel(event.service)}</td>
                <td>{event.status}</td>
                <td>{event.requestSummary ?? event.responseSummary ?? event.errorMessage ?? "No summary"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
