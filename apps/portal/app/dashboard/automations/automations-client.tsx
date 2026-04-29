"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  automationPreferenceDescriptors,
  automationRecipeDescriptors,
  serviceLabels
} from "@flowlab/contracts";
import { recipeToPreferenceMap, toQueueSummary } from "./automations-client.helpers";

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

type PreferenceDescriptor = (typeof automationPreferenceDescriptors)[number];
type RecipeDescriptor = (typeof automationRecipeDescriptors)[number];
type PreferenceMap = Record<string, boolean>;

type FlashMessage = {
  kind: "success" | "error";
  text: string;
};

type Props = {
  builtIn: PreferenceDescriptor[];
  advanced: PreferenceDescriptor[];
  recipes: RecipeDescriptor[];
  initialPreferences: PreferenceMap;
  health: {
    pending: number;
    processing: number;
    failed: number;
  };
  makeWebhookCount: number;
  makeIntegrationStatus: string | null;
};

export default function AutomationsClient({
  builtIn,
  advanced,
  recipes,
  initialPreferences,
  health,
  makeWebhookCount,
  makeIntegrationStatus
}: Props) {
  const [preferences, setPreferences] = useState<PreferenceMap>(initialPreferences);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const builtInEnabledCount = useMemo(
    () => builtIn.filter((item) => Boolean(preferences[item.key])).length,
    [builtIn, preferences]
  );

  const queueSummary = toQueueSummary(health.failed);

  async function savePreference(input: { key: string; enabled: boolean; label: string }) {
    if (activeKey || activeRecipe) {
      return;
    }

    const previous = preferences[input.key];
    setActiveKey(input.key);
    setFlash(null);
    setPreferences((current) => ({ ...current, [input.key]: input.enabled }));

    try {
      const formData = new FormData();
      formData.set("key", input.key);
      formData.set("enabled", String(input.enabled));
      formData.set("returnTo", "/dashboard/automations");

      const response = await fetch("/api/tenant/automations/preferences", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Preference update failed with status ${response.status}`);
      }

      setFlash({ kind: "success", text: `Saved ${input.label}.` });
    } catch (error) {
      setPreferences((current) => ({ ...current, [input.key]: previous }));
      setFlash({ kind: "error", text: "Couldn't update that automation setting. Please try again." });
    } finally {
      setActiveKey(null);
    }
  }

  async function applyRecipe(recipe: RecipeDescriptor) {
    if (activeKey || activeRecipe) {
      return;
    }

    const previous = preferences;
    setActiveRecipe(recipe.key);
    setFlash(null);
    setPreferences((current) => recipeToPreferenceMap(recipe.enables, current));

    try {
      const formData = new FormData();
      formData.set("recipeKey", recipe.key);
      formData.set("returnTo", "/dashboard/automations");

      const response = await fetch("/api/tenant/automations/recipes", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Recipe apply failed with status ${response.status}`);
      }

      setFlash({ kind: "success", text: `Applied recipe ${recipe.title}.` });
    } catch (error) {
      setPreferences(previous);
      setFlash({ kind: "error", text: "Couldn't apply that recipe. Please try again." });
    } finally {
      setActiveRecipe(null);
    }
  }

  return (
    <>
      {flash ? (
        <div
          className="rounded-lg border bg-card p-4"
          style={{
            borderLeft: flash.kind === "success" ? "3px solid #16a34a" : "3px solid #dc2626",
            color: flash.kind === "success" ? "#cbd5e1" : "#fca5a5"
          }}
        >
          {flash.text}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Built-in automation</div>
            <div className="text-3xl font-semibold">{builtInEnabledCount}</div>
            <p className="text-sm text-muted-foreground">of {builtIn.length} built-in automations are currently active.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Queue health</div>
            <div className="text-3xl font-semibold">{health.pending + health.processing}</div>
            <p className="text-sm text-muted-foreground">jobs are in flight. {queueSummary}.</p>
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
              Control what gets sent or scheduled on your behalf. Turning one off stops future jobs from being queued for that automation - existing ones are unaffected.
            </p>
          </div>
          <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/system-health">
            Review queue health
          </Link>
        </div>

        <div className="space-y-3">
          {builtIn.map((descriptor) => {
            const enabled = Boolean(preferences[descriptor.key]);
            const isPending = activeKey === descriptor.key;
            return (
              <div key={descriptor.key} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className={`status-pill ${enabled ? "is-on" : "is-off"}`}>{enabled ? "On" : "Off"}</span>
                    <span>{descriptor.channels}</span>
                    <span>Needs: {(dependencyLabels[descriptor.key] ?? []).join(", ")}</span>
                  </div>
                  <h3>{descriptor.title}</h3>
                  <p>{descriptor.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className={
                      enabled
                        ? "inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                        : "inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    }
                    disabled={Boolean(activeKey || activeRecipe)}
                    onClick={() => savePreference({ key: descriptor.key, enabled: !enabled, label: descriptor.title })}
                    type="button"
                  >
                    {isPending ? "Saving..." : enabled ? "Turn off" : "Turn on"}
                  </button>
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
          {recipes.map((recipe) => (
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
                <button
                  className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                  disabled={Boolean(activeKey || activeRecipe)}
                  onClick={() => applyRecipe(recipe)}
                  type="button"
                >
                  {activeRecipe === recipe.key ? "Applying..." : "Apply recipe"}
                </button>
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
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/integrations">
              Open integrations
            </Link>
            <a className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/api/tenant/blueprints/download">
              Download blueprint ZIP
            </a>
          </div>
        </div>

        {advanced.map((descriptor) => {
          const enabled = Boolean(preferences[descriptor.key]);
          const isPending = activeKey === descriptor.key;
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
                    : `No Make webhook URLs configured yet${makeIntegrationStatus ? ` (${makeIntegrationStatus.replace(/_/g, " ")})` : ""}.`}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  className={
                    enabled
                      ? "inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                      : "inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  }
                  disabled={Boolean(activeKey || activeRecipe)}
                  onClick={() => savePreference({ key: descriptor.key, enabled: !enabled, label: descriptor.title })}
                  type="button"
                >
                  {isPending ? "Saving..." : enabled ? "Disable Make" : "Enable Make"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
