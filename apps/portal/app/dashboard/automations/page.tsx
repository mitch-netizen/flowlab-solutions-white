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

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
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
    
      <DashboardPageScaffold
        eyebrow="Setup"
        title="Automations"
        description="Turn individual automations on or off, apply a preset recipe, or connect Make for advanced external workflows."
        section="setup"
      >

      {savedDescriptor ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #16a34a", color: "#cbd5e1" }}>
          Saved <strong>{savedDescriptor.title}</strong>.
        </div>
      ) : null}

      {savedRecipe ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #16a34a", color: "#cbd5e1" }}>
          Applied recipe <strong>{savedRecipe.title}</strong>.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border bg-card p-4" style={{ borderLeft: "3px solid #dc2626", color: "#fca5a5" }}>
          Couldn&apos;t update that automation setting. Please try again.
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Built-in automation</div>
            <div className="text-3xl font-semibold">{builtInEnabledCount}</div>
            <p className="text-sm text-muted-foreground">
              of {builtIn.length} built-in automations are currently active.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Queue health</div>
            <div className="text-3xl font-semibold">{health.pending + health.processing}</div>
            <p className="text-sm text-muted-foreground">
              jobs are in flight. {queueSummary}.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Advanced Make</div>
            <div className="text-3xl font-semibold">{makeWebhookCount}</div>
            <p className="text-sm text-muted-foreground">
              webhook{makeWebhookCount === 1 ? "" : "s"} configured. {preferences.advanced_make_webhooks ? "External hooks are enabled." : "External hooks stay optional."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Built-in automations</div>
            <h2>Built-in automations</h2>
            <p>
              Control what gets sent or scheduled on your behalf. Turning one off stops future jobs from being queued for that automation — existing ones are unaffected.
            </p>
          </div>
          <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/system-health">Review queue health</Link>
        </div>

        <div className="space-y-3">
          {builtIn.map((descriptor) => {
            const enabled = preferences[descriptor.key];
            return (
              <div key={descriptor.key} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${enabled ? "is-on" : "is-off"}`}>{enabled ? "On" : "Off"}</span>
                    <span>{descriptor.channels}</span>
                    <span>Needs: {dependencyLabels[descriptor.key].join(", ")}</span>
                  </div>
                  <h3>{descriptor.title}</h3>
                  <p>{descriptor.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <form action="/api/tenant/automations/preferences" method="post">
                    <input type="hidden" name="key" value={descriptor.key}  />
                    <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                    <input type="hidden" name="returnTo" value="/dashboard/automations" />
                    <button className={enabled ? "inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" : "inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"} type="submit">
                      {enabled ? "Turn off" : "Turn on"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Automation recipes</div>
          <h2>Automation recipes</h2>
          <p>Apply a preset to get a sensible starting configuration in one click, then adjust the individual switches above to suit your workflow.</p>
        </div>

        <div className="space-y-3">
          {automationRecipeDescriptors.map((recipe) => (
            <div key={recipe.key} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off">Preset</span>
                </div>
                <h3>{recipe.title}</h3>
                <p>{recipe.description}</p>
                <div className="text-sm text-muted-foreground">
                  Enables: {recipe.enables.map((key) => automationPreferenceDescriptors.find((descriptor) => descriptor.key === key)?.title ?? key).join(", ")}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <form action="/api/tenant/automations/recipes" method="post">
                  <input type="hidden" name="recipeKey" value={recipe.key} />
                  <input type="hidden" name="returnTo" value="/dashboard/automations" />
                  <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">Apply recipe</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Advanced automation</div>
            <h2>Make.com integration</h2>
            <p>
              Built-in automations handle CRM, jobs, invoicing, and comms. Enable Make only when you want to push those events into external tools or build custom downstream workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/integrations">Open integrations</Link>
            <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/api/tenant/blueprints/download">Download blueprint ZIP</a>
          </div>
        </div>

        {advanced.map((descriptor) => {
          const enabled = preferences[descriptor.key];
          return (
            <div key={descriptor.key} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${enabled ? "is-on" : "is-off"}`}>{enabled ? "Enabled" : "Disabled"}</span>
                  <span>{descriptor.channels}</span>
                  <span>{serviceLabels.make_com}</span>
                </div>
                <h3>{descriptor.title}</h3>
                <p>{descriptor.description}</p>
                <div className="text-sm text-muted-foreground">
                  {makeWebhookCount > 0
                    ? `${makeWebhookCount} webhook${makeWebhookCount === 1 ? "" : "s"} stored in ${serviceLabels.make_com}.`
                    : `No Make webhook URLs configured yet${makeIntegration ? ` (${makeIntegration.status.replace(/_/g, " ")})` : ""}.`}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <form action="/api/tenant/automations/preferences" method="post">
                  <input type="hidden" name="key" value={descriptor.key} />
                  <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                  <input type="hidden" name="returnTo" value="/dashboard/automations" />
                  <button className={enabled ? "inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" : "inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"} type="submit">
                    {enabled ? "Disable Make" : "Enable Make"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPageScaffold>
  );
}
