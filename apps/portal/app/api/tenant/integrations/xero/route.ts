import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { getTenantIntegrationRecord } from "@flowlab/db";
import { decryptJson } from "@flowlab/integrations";

/**
 * GET — Begin Xero OAuth flow.
 * Redirects user to Xero's authorization page.
 */
export async function GET(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch tenant's Xero client credentials
  const integration = await getTenantIntegrationRecord(session.tenantId, "xero");
  const credentials = integration?.credentialsJson ? decryptJson(integration.credentialsJson) : {};
  const clientId = credentials.clientId || process.env.XERO_CLIENT_ID || "";

  if (!clientId) {
    return NextResponse.json(
      { error: "Xero Client ID not configured. Add it in Integrations → Xero before connecting." },
      { status: 400 }
    );
  }

  const rootDomain = process.env.ROOT_DOMAIN ?? "flowlabsolutions.com.au";
  const isLocal = process.env.NODE_ENV !== "production";
  const tenantSlug = request.headers.get("x-flowlab-host")?.split(".")[0] ?? "tenant";
  const redirectUri = isLocal
    ? `http://${tenantSlug}.localhost:3001/api/tenant/integrations/xero/callback`
    : `https://${tenantSlug}.${rootDomain}/api/tenant/integrations/xero/callback`;

  const state = Buffer.from(JSON.stringify({ tenantId: session.tenantId })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts offline_access",
    state
  });

  return NextResponse.redirect(`https://login.xero.com/identity/connect/authorize?${params.toString()}`);
}
