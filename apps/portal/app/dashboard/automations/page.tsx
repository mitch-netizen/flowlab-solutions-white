import Link from "next/link";

import {
  automationPreferenceDescriptors,
  automationRecipeDescriptors,
  serviceLabels
} from "@flowlab/contracts";
import {
  getTenantAutomationHealth,
  getTenantAutomationPreferencesMap,
  getTenantIntegrationRecord,
  getTenantIntegrations
} from "@flowlab/db";
import { decryptJson } from "@flowlab/integrations";

import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";

const dependencyLabels: Record<string, string[]> = {
  enquiry_confirmation: ["Brevo Email"],
  booking_confirmation: ["Brevo SMS", "Brevo Email"],
  invoice_reminders: ["Brevo SMS"],
  feedback_requests: ["Brevo SMS"],
  review_requests: ["Brevo SMS"],
  rebook_reminders: ["Brevo SMS"],
  morning_digest: ["Brevo SMS", "Brevo Email"],
  weekly_analysis: ["FlowLab AI"],
  advanced_make_webhooks: ["Make.com"]
};

export default async function AutomationsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const params = searchParams ? await searchParams : {};
  const [preferences, health, integrations, makeRecord] = await Promise.all([
    getTenantAutomationPreferencesMap(session.tenantId),
    getTenantAutomationHealth(session.tenantId),
    getTenantIntegrations(session.tenantId),
    getTenantIntegrationRecord(session.tenantId, "make_com")
  ]);

  const builtIn = automationPreferenceDescriptors.filter((descriptor) => descriptor.group === "built_in");
  const advanced = automationPreferenceDescriptors.filter((descriptor) => descriptor.group === "advanced");
  const makeIntegration = integrations.find((integration) => integration.service === "make_com") ?? null;
  const makeWebhookCount = makeRecord?.credentialsJson
    ? Object.entries(decryptJson(makeRecord.credentialsJson)).filter(
        ([key, value]) => key.toLowerCase().includes("webhook") && String(value).trim().length > 0
      ).length
    : 0;

  const savedKey = typeof params.saved === "string" ? params.saved : null;
  const recipeKey = typeof params.recipe === "string" ? params.recipe : null;
  const error = typeof params.error === "string" ? params.error : null;
  const savedDescriptor = savedKey
    ? automationPreferenceDescriptors.find((descriptor) => descriptor.key === savedKey)
    : null;
  const savedRecipe = recipeKey
    ? automationRecipeDescriptors.find((recipe) => recipe.key === recipeKey)
    : null;
  const builtInEnabledCount = builtIn.filter((item) => preferences[item.key]).length;
  const queueSummary =
    health.failed > 0
      ? `${health.failed} failed job${health.failed === 1 ? "" : "s"} need attention`
      : "No failed jobs right now";

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Automation controls that stay readable when the day gets busy."
        description="Built-in automations handle confirmations, reminders, and operator briefs inside FlowLab. Make stays optional for the moments you want extra downstream orchestration."
        section="setup"
      />

      {savedDescriptor ? (
        <div className="surface" style={{ borderLeft: "3px solid #16a34a", color: "#cbd5e1" }}>
          Saved <strong>{savedDescriptor.title}</strong>.
        </div>
      ) : null}

      {savedRecipe ? (
        <div className="surface" style={{ borderLeft: "3px solid #16a34a", color: "#cbd5e1" }}>
          Applied recipe <strong>{savedRecipe.title}</strong>.
        </div>
      ) : null}

      {error ? (
        <div className="surface" style={{ borderLeft: "3px solid #dc2626", color: "#fca5a5" }}>
          Couldn&apos;t update that automation setting. Please try again.
        </div>
      ) : null}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Built-in automation</div>
            <div className="setup-summary-value">{builtInEnabledCount}</div>
            <p className="setup-summary-copy">
              of {builtIn.length} everyday automations are active inside FlowLab.
            </p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Queue health</div>
            <div className="setup-summary-value">{health.pending + health.processing}</div>
            <p className="setup-summary-copy">
              jobs are in flight. {queueSummary}.
            </p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Advanced Make</div>
            <div className="setup-summary-value">{makeWebhookCount}</div>
            <p className="setup-summary-copy">
              webhook{makeWebhookCount === 1 ? "" : "s"} configured. {preferences.advanced_make_webhooks ? "External hooks are enabled." : "External hooks stay optional."}
            </p>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Built-in automations</div>
            <h2>Switch the practical automations on or off without digging through plumbing</h2>
            <p>
              These settings control what FlowLab sends or schedules on your behalf. Turning one off stops new queueing for that automation without affecting everything else.
            </p>
          </div>
          <Link className="ghost" href="/dashboard/system-health">Review queue health</Link>
        </div>

        <div className="setup-list">
          {builtIn.map((descriptor) => {
            const enabled = preferences[descriptor.key];
            return (
              <div key={descriptor.key} className="setup-row">
                <div className="setup-row-main">
                  <div className="setup-row-meta">
                    <span className={`status-pill ${enabled ? "is-on" : "is-off"}`}>{enabled ? "On" : "Off"}</span>
                    <span>{descriptor.channels}</span>
                    <span>Needs: {dependencyLabels[descriptor.key].join(", ")}</span>
                  </div>
                  <h3>{descriptor.title}</h3>
                  <p>{descriptor.description}</p>
                </div>
                <div className="setup-row-actions">
                  <form action="/api/tenant/automations/preferences" method="post">
                    <input type="hidden" name="key" value={descriptor.key} />
                    <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                    <input type="hidden" name="returnTo" value="/dashboard/automations" />
                    <button className={enabled ? "ghost" : "cta"} type="submit">
                      {enabled ? "Turn off" : "Turn on"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-copy">
          <div className="eyebrow">Automation recipes</div>
          <h2>Start from an operating style instead of configuring every switch one by one</h2>
          <p>Recipes are quick presets for common operator habits. Apply one when you want a sensible starting point, then fine-tune the individual switches above.</p>
        </div>

        <div className="setup-list">
          {automationRecipeDescriptors.map((recipe) => (
            <div key={recipe.key} className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Preset</span>
                </div>
                <h3>{recipe.title}</h3>
                <p>{recipe.description}</p>
                <div className="setup-note">
                  Enables: {recipe.enables.map((key) => automationPreferenceDescriptors.find((descriptor) => descriptor.key === key)?.title ?? key).join(", ")}
                </div>
              </div>
              <div className="setup-row-actions">
                <form action="/api/tenant/automations/recipes" method="post">
                  <input type="hidden" name="recipeKey" value={recipe.key} />
                  <input type="hidden" name="returnTo" value="/dashboard/automations" />
                  <button className="ghost" type="submit">Apply recipe</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Advanced automation</div>
            <h2>Keep Make separate from the built-in operating system</h2>
            <p>
              FlowLab still handles CRM, jobs, invoicing, reminders, and comms logging on its own. Turn Make on only when you want to push those events into external tools.
            </p>
          </div>
          <div className="setup-row-actions">
            <Link className="ghost" href="/dashboard/integrations">Open integrations</Link>
            <a className="ghost" href="/api/tenant/blueprints/download">Download blueprint ZIP</a>
          </div>
        </div>

        {advanced.map((descriptor) => {
          const enabled = preferences[descriptor.key];
          return (
            <div key={descriptor.key} className="setup-row" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${enabled ? "is-on" : "is-off"}`}>{enabled ? "Enabled" : "Disabled"}</span>
                  <span>{descriptor.channels}</span>
                  <span>{serviceLabels.make_com}</span>
                </div>
                <h3>{descriptor.title}</h3>
                <p>{descriptor.description}</p>
                <div className="setup-note">
                  {makeWebhookCount > 0
                    ? `${makeWebhookCount} webhook${makeWebhookCount === 1 ? "" : "s"} stored in ${serviceLabels.make_com}.`
                    : `No Make webhook URLs configured yet${makeIntegration ? ` (${makeIntegration.status.replace(/_/g, " ")})` : ""}.`}
                </div>
              </div>
              <div className="setup-row-actions">
                <form action="/api/tenant/automations/preferences" method="post">
                  <input type="hidden" name="key" value={descriptor.key} />
                  <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                  <input type="hidden" name="returnTo" value="/dashboard/automations" />
                  <button className={enabled ? "ghost" : "cta"} type="submit">
                    {enabled ? "Disable Make" : "Enable Make"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
