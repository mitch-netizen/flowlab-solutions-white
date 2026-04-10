import { requireTenantSession } from "../../../../../../lib/session";

import { NextResponse } from "next/server";

import type { IntegrationService } from "@flowlab/contracts";
import { getTenantIntegrationRecord, saveTenantIntegrationCredentials } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import { decryptJson, encryptJson } from "@flowlab/integrations";

export async function POST(request: Request, { params }: { params: Promise<{ service: string }> }) {
  const session = await requireTenantSession();

  const { service: serviceParam } = await params;
  const service = serviceParam as IntegrationService;
  const formData = await request.formData();
  const incomingCredentials = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key, value]) => key !== "service" && typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, String(value)])
  );
  const existingRecord = await getTenantIntegrationRecord(session.tenantId, service);
  const existingCredentials = existingRecord?.credentialsJson ? decryptJson(existingRecord.credentialsJson) : {};
  const credentials = { ...existingCredentials, ...incomingCredentials };

  await saveTenantIntegrationCredentials({
    tenantId: session.tenantId,
    service,
    credentialsJson: encryptJson(credentials)
  });

  await logPlatformEvent({
    tenantId: session.tenantId,
    eventType: "info",
    service,
    direction: "outbound",
    status: "success",
    requestSummary: `Saved encrypted credentials for ${service}`,
    responseSummary: `${Object.keys(incomingCredentials).length} field(s) updated, ${Object.keys(credentials).length} stored total`,
    triggeredBy: "tenant_integration_save"
  });

  return NextResponse.redirect(new URL("/dashboard/integrations", request.url), 303);
}
