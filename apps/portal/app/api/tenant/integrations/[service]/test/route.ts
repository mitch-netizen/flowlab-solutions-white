import { NextResponse } from "next/server";

import { integrationServiceSchema } from "@flowlab/contracts";
import { resolveIntegrationCredentials, updateIntegrationTestResult } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import { testIntegration } from "@flowlab/integrations";
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
  const envFallback =
    service === "google_maps"
      ? { apiKey: process.env.GOOGLE_MAPS_API_KEY }
      : service === "docuseal"
        ? { apiKey: process.env.DOCUSEAL_API_KEY }
        : service === "twilio"
          ? { apiKey: process.env.BREVO_API_KEY, sender: process.env.BREVO_SMS_SENDER }
          : service === "sendgrid"
            ? { apiKey: process.env.BREVO_API_KEY, fromEmail: process.env.BREVO_FROM_EMAIL, fromName: process.env.BREVO_FROM_NAME }
            : service === "xero"
              ? { clientId: process.env.XERO_CLIENT_ID, clientSecret: process.env.XERO_CLIENT_SECRET }
              : service === "stripe"
                ? { secretKey: process.env.STRIPE_SECRET_KEY }
                : undefined;

  // Ensure the tenant in the form matches the authenticated session
  if (tenantId && tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = tenantId
    ? await resolveIntegrationCredentials({
        tenantId,
        service,
        envFallback
      })
    : { credentials: {} };
  const savedCredentials = resolved.credentials;
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
