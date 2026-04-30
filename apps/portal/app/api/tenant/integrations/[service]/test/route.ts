import { NextResponse } from "next/server";

import { integrationServiceSchema } from "@flowlab/contracts";
import { getTenantIntegrationRecord, updateIntegrationTestResult } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import { decryptJson, testIntegration } from "@flowlab/integrations";
import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ service: string }> }) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const { service: serviceParam } = await params;
  const parsedService = integrationServiceSchema.safeParse(serviceParam);
  if (!parsedService.success) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=invalid_service", request.url), 303);
  }
  const service = parsedService.data;
  const tenantId = String(formData.get("tenantId") ?? "");
  const credentialValue = String(formData.get("credentialValue") ?? "");

  // Ensure the tenant in the form matches the authenticated session
  if (tenantId && tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = tenantId ? await getTenantIntegrationRecord(tenantId, service) : null;
  const savedCredentials = record?.credentialsJson ? decryptJson(record.credentialsJson) : {};
  const credentials: Record<string, string> = credentialValue ? { ...savedCredentials, credentialValue } : savedCredentials;
  const result = await testIntegration(service, credentials);

  if (tenantId) {
    const isNotConfigured = result.status === "not_configured";
    await updateIntegrationTestResult({
      tenantId,
      service,
      status: result.status,
      ok: result.ok,
      message: result.message
    });

    await logPlatformEvent({
      tenantId,
      eventType: isNotConfigured || result.ok ? "info" : "error",
      service,
      direction: "outbound",
      status: isNotConfigured || result.ok ? "success" : "failed",
      requestSummary: `Integration test initiated for ${service}`,
      responseSummary: isNotConfigured
        ? result.message
        : result.ok
          ? "Credential set accepted for downstream live verification."
          : null,
      errorMessage: isNotConfigured || result.ok ? null : result.message,
      triggeredBy: "tenant_integration_test"
    });
  }

  return NextResponse.redirect(new URL("/dashboard/integrations", request.url), 303);
}
