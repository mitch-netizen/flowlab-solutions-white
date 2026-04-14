import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { IntegrationService, IntegrationStatus } from "@prisma/client";
import { getPlatformIntegrationRecord, getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { buildTenantUrl, getCanonicalRootDomain } from "@flowlab/contracts/server";
import { logPlatformEvent } from "@flowlab/events";
import { decryptJson, encryptJson } from "@flowlab/integrations";

const xeroStateSchema = z.object({
  scope: z.enum(["tenant", "platform"]).optional().default("tenant"),
  tenantId: z.string().uuid().optional(),
  platformUserId: z.string().uuid().optional(),
  csrf: z.string().min(1)
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin?xero_error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/admin?xero_error=missing_params", request.url));
  }

  let scope: "tenant" | "platform";
  let tenantId: string;
  try {
    const raw = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const parsed = xeroStateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.redirect(new URL("/admin?xero_error=invalid_state", request.url));
    }
    const cookieStore = await cookies();
    const expectedCsrf = cookieStore.get("xero_oauth_csrf")?.value;
    cookieStore.delete("xero_oauth_csrf");
    if (!expectedCsrf || parsed.data.csrf !== expectedCsrf) {
      return NextResponse.redirect(new URL("/admin?xero_error=invalid_state", request.url));
    }
    scope = parsed.data.scope;
    tenantId = parsed.data.tenantId ?? "";
  } catch {
    return NextResponse.redirect(new URL("/admin?xero_error=invalid_state", request.url));
  }
  const [tenantIntegration, platformIntegration, tenant] = await Promise.all([
    tenantId ? getTenantIntegrationRecord(tenantId, "xero") : Promise.resolve(null),
    getPlatformIntegrationRecord("xero"),
    tenantId ? prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }) : Promise.resolve(null)
  ]);

  const credentialsSource = scope === "platform" ? platformIntegration : tenantIntegration;
  const credentials = credentialsSource?.credentialsJson ? decryptJson(credentialsSource.credentialsJson) : {};
  const clientId = credentials.clientId || process.env.XERO_CLIENT_ID || "";
  const clientSecret = credentials.clientSecret || process.env.XERO_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    const destination = scope === "tenant" && tenant?.slug
      ? buildTenantUrl(tenant.slug, "/dashboard/integrations?xero_error=missing_credentials")
      : "/admin?xero_error=missing_credentials";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const isLocal = process.env.NODE_ENV !== "production";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";

  try {
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

    let orgName = "Connected";
    try {
      const connectionsResponse = await fetch("https://api.xero.com/connections", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" }
      });
      if (connectionsResponse.ok) {
        const connections = (await connectionsResponse.json()) as Array<{ tenantName?: string }>;
        orgName = connections[0]?.tenantName ?? "Connected";
      }
    } catch {}

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 1800) * 1000).toISOString();
    const updatedCredentials = {
      ...credentials,
      orgName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt
    };

    if (scope === "platform") {
      await prisma.platformIntegration.upsert({
        where: { service: IntegrationService.xero },
        create: {
          service: IntegrationService.xero,
          status: IntegrationStatus.connected,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        },
        update: {
          status: IntegrationStatus.connected,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          lastErrorMessage: null,
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        }
      });
    } else {
      await prisma.tenantIntegration.upsert({
        where: { tenantId_service: { tenantId, service: IntegrationService.xero } },
        create: {
          tenantId,
          service: IntegrationService.xero,
          status: IntegrationStatus.connected,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        },
        update: {
          status: IntegrationStatus.connected,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          lastErrorMessage: null,
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        }
      });
    }

    await logPlatformEvent({
      tenantId: scope === "tenant" ? tenantId : null,
      eventType: "api_call",
      service: "xero",
      direction: "inbound",
      status: "success",
      requestSummary: scope === "platform" ? "Platform Xero OAuth connection completed" : "Xero OAuth connection completed",
      responseSummary: `Connected to organisation: ${orgName}`,
      triggeredBy: scope === "platform" ? "platform_xero_oauth" : "tenant_xero_oauth"
    });

    const destination = scope === "tenant" && tenant?.slug
      ? buildTenantUrl(tenant.slug, "/dashboard/integrations?xero_connected=1")
      : "/admin?xero_connected=1";

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (err) {
    await logPlatformEvent({
      tenantId: scope === "tenant" ? tenantId : null,
      eventType: "error",
      service: "xero",
      direction: "inbound",
      status: "failed",
      requestSummary: scope === "platform" ? "Platform Xero OAuth callback failed" : "Xero OAuth callback failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      triggeredBy: scope === "platform" ? "platform_xero_oauth" : "tenant_xero_oauth"
    });

    // Do not surface raw error messages to the client — log internally and return a
    // generic code so the UI can show a user-friendly message without leaking internals.
    const destination = scope === "tenant" && tenant?.slug
      ? buildTenantUrl(tenant.slug, "/dashboard/integrations?xero_error=oauth_failed")
      : "/admin?xero_error=oauth_failed";

    return NextResponse.redirect(new URL(destination, request.url));
  }
}
