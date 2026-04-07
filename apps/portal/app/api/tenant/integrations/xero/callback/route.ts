import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import { logPlatformEvent } from "@flowlab/events";

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

  // Decode state to get tenantId (no session cookie available during redirect)
  let tenantId: string;
  try {
    const stateJson = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as { tenantId: string };
    tenantId = stateJson.tenantId;
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

  const rootDomain = process.env.ROOT_DOMAIN ?? "flowlabsolutions.com.au";
  const isLocal = process.env.NODE_ENV !== "production";
  const slug = integration ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }) : null;
  const tenantSlug = slug?.slug ?? "tenant";
  const redirectUri = isLocal
    ? `http://${tenantSlug}.localhost:3001/api/tenant/integrations/xero/callback`
    : `https://${tenantSlug}.${rootDomain}/api/tenant/integrations/xero/callback`;

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

    // Get connected Xero organisation name
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

    // Save encrypted tokens alongside existing credentials
    const updatedCredentials = {
      ...credentials,
      orgName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt
    };

    await prisma.tenantIntegration.upsert({
      where: { tenantId_service: { tenantId, service: "xero" as any } },
      create: {
        tenantId,
        service: "xero" as any,
        status: "connected" as any,
        credentialsJson: encryptJson(updatedCredentials),
        lastTestedAt: new Date(),
        lastTestResult: "success"
      },
      update: {
        status: "connected" as any,
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

    return NextResponse.redirect(
      new URL(`/dashboard/integrations?xero_error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed")}`, request.url)
    );
  }
}
