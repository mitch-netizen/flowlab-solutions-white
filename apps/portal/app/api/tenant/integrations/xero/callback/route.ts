import { requireTenantSession } from "../../../../../../lib/session";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

import { IntegrationService, IntegrationStatus } from "@prisma/client";
import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import { getXeroTenantId } from "@flowlab/integrations/xero";
import { logPlatformEvent } from "@flowlab/events";

const xeroStateSchema = z.object({
  tenantId: z.string().uuid(),
  csrf: z.string().min(1)
});

/**
 * GET — Xero OAuth callback.
 * Exchanges authorization code for access/refresh tokens and saves them.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?xero_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/dashboard/integrations?xero_error=missing_params", request.url));
  }

  // Decode, validate, and CSRF-check the state parameter
  let tenantId: string;
  try {
    const raw = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const parsed = xeroStateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.redirect(new URL("/dashboard/integrations?xero_error=invalid_state", request.url));
    }
    const cookieStore = await cookies();
    const expectedCsrf = cookieStore.get("xero_oauth_csrf")?.value;
    cookieStore.delete("xero_oauth_csrf");
    if (!expectedCsrf || parsed.data.csrf !== expectedCsrf) {
      return NextResponse.redirect(new URL("/dashboard/integrations?xero_error=invalid_state", request.url));
    }
    tenantId = parsed.data.tenantId;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/integrations?xero_error=invalid_state", request.url));
  }

  // Fetch tenant's Xero client credentials to exchange the code
  const integration = await getTenantIntegrationRecord(tenantId, "xero");
  const credentials = integration?.credentialsJson ? decryptJson(integration.credentialsJson) : {};
  const clientId = credentials.clientId || process.env.XERO_CLIENT_ID || "";
  const clientSecret = credentials.clientSecret || process.env.XERO_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/integrations?xero_error=missing_credentials", request.url)
    );
  }

  const rootDomain = getCanonicalRootDomain();
  const isLocal = process.env.NODE_ENV !== "production";
  const slug = integration ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }) : null;
  const tenantSlug = slug?.slug ?? "tenant";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error ?? "Token exchange failed");
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 1800) * 1000).toISOString();

    // Fetch the Xero org's tenant ID (required for all subsequent API calls)
    // and organisation name. getXeroTenantId throws if no org is found.
    const { tenantId: xeroTenantId, orgName } = await getXeroTenantId(tokenData.access_token);

    // Save encrypted tokens + xeroTenantId alongside existing credentials
    const updatedCredentials = {
      ...credentials,
      orgName,
      xeroTenantId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt
    };

    await prisma.tenantIntegration.upsert({
      where: { tenantId_service: { tenantId, service: IntegrationService.xero } },
      create: {
        tenantId,
        service: IntegrationService.xero,
        status: IntegrationStatus.connected,
        credentialsJson: encryptJson(updatedCredentials),
        lastTestedAt: new Date(),
        lastTestResult: "success"
      },
      update: {
        status: IntegrationStatus.connected,
        credentialsJson: encryptJson(updatedCredentials),
        lastTestedAt: new Date(),
        lastTestResult: "success",
        lastErrorMessage: null
      }
    });

    await logPlatformEvent({
      tenantId,
      eventType: "api_call",
      service: "xero",
      direction: "inbound",
      status: "success",
      requestSummary: "Xero OAuth connection completed",
      responseSummary: `Connected to organisation: ${orgName}`,
      triggeredBy: "tenant_xero_oauth"
    });

    redirect("/dashboard/integrations?xero_connected=1");
  } catch (err) {
    await logPlatformEvent({
      tenantId,
      eventType: "error",
      service: "xero",
      direction: "inbound",
      status: "failed",
      requestSummary: "Xero OAuth callback failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      triggeredBy: "tenant_xero_oauth"
    });

    // Do not surface raw error messages to the client — full detail is in platform event log.
    return NextResponse.redirect(
      new URL("/dashboard/integrations?xero_error=oauth_failed", request.url)
    );
  }
}
