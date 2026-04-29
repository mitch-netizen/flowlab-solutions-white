import { automationPreferenceDescriptors, automationRecipeDescriptors } from "@flowlab/contracts";
import {
  getTenantAutomationHealth,
  getTenantAutomationPreferencesMap,
  getTenantIntegrationRecord,
  getTenantIntegrations
} from "@flowlab/db";
import { decryptJson } from "@flowlab/integrations";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";
import AutomationsClient from "./automations-client";

export default async function AutomationsPage() {
  const session = await requireTenantSession();
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

  return (
    <DashboardPageScaffold
      eyebrow="Setup"
      title="Automations"
      description="Turn individual automations on or off, apply a preset recipe, or connect Make for advanced external workflows."
      section="setup"
    >
      <AutomationsClient
        advanced={advanced}
        builtIn={builtIn}
        health={health}
        initialPreferences={preferences}
        makeIntegrationStatus={makeIntegration?.status ?? null}
        makeWebhookCount={makeWebhookCount}
        recipes={automationRecipeDescriptors}
      />
    </DashboardPageScaffold>
  );
}
