import { NextResponse } from "next/server";

import type { IntegrationService } from "@flowlab/contracts";
import { getTenantIntegrationRecord, updateIntegrationTestResult } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import { decryptJson, testIntegration } from "@flowlab/integrations";

export async function POST(request: Request, { params }: { params: Promise<{ service: string }> }) {
  const formData = await request.formData();
  const service = ((await params).service) as IntegrationService;
  const tenantId = String(formData.get("tenantId") ?? "");
  const credentialValue = String(formData.get("credentialValue") ?? "");

  const record = tenantId ? await getTenantIntegrationRecord(tenantId, service) : null;
  const savedCredentials = record?.credentialsJson ? decryptJson(record.credentialsJson) : {};
  const credentials: Record<string, string> = credentialValue ? { ...savedCredentials, credentialValue } : savedCredentials;
  const result = await testIntegration(service, credentials);

  if (tenantId) {
    await updateIntegrationTestResult({
      tenantId,
      service,
      status: result.status,
      ok: result.ok,
      message: result.message
    });

    await logPlatformEvent({
      tenantId,
      eventType: result.ok ? "info" : "error",
      service,
      direction: "outbound",
      status: result.ok ? "success" : "failed",
      requestSummary: `Integration test initiated for ${service}`,
      responseSummary: result.ok ? "Credential set accepted for downstream live verification." : null,
      errorMessage: result.ok ? null : result.message,
      triggeredBy: "tenant_integration_test"
    });
  }

  return NextResponse.redirect(new URL("/dashboard/integrations", request.url), 303);
}
