import { NextResponse } from "next/server";

import { getPlatformIntegrationRecord, getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import { decryptJson, encryptJson } from "@flowlab/integrations";

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

  let stateJson: { scope?: "tenant" | "platform"; tenantId?: string; platformUserId?: string };
  try {
    stateJson = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as typeof stateJson;
  } catch {
    return NextResponse.redirect(new URL("/admin?xero_error=invalid_state", request.url));
  }

  const scope = stateJson.scope ?? "tenant";
  const tenantId = stateJson.tenantId ?? "";
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
      ? `https://${tenant.slug}.${process.env.DEFAULT_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "flowlabsolutions.com.au"}/dashboard/integrations?xero_error=missing_credentials`
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
        where: { service: "xero" as any },
        create: {
          service: "xero" as any,
          status: "connected" as any,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        },
        update: {
          status: "connected" as any,
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
        where: { tenantId_service: { tenantId, service: "xero" as any } },
        create: {
          tenantId,
          service: "xero" as any,
          status: "connected" as any,
          credentialsJson: encryptJson(updatedCredentials),
          lastTestedAt: new Date(),
          lastTestResult: "success",
          oauthAccessToken: tokenData.access_token,
          oauthRefreshToken: tokenData.refresh_token ?? "",
          oauthExpiresAt: new Date(expiresAt)
        },
        update: {
          status: "connected" as any,
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

    const portalRootDomain = process.env.DEFAULT_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "flowlabsolutions.com.au";
    const destination = scope === "tenant" && tenant?.slug
      ? `https://${tenant.slug}.${portalRootDomain}/dashboard/integrations?xero_connected=1`
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

    const portalRootDomain = process.env.DEFAULT_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "flowlabsolutions.com.au";
    const destination = scope === "tenant" && tenant?.slug
      ? `https://${tenant.slug}.${portalRootDomain}/dashboard/integrations?xero_error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed")}`
      : `/admin?xero_error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed")}`;

    return NextResponse.redirect(new URL(destination, request.url));
  }
}
