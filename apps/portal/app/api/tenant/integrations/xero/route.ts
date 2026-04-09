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

  const isLocal = process.env.NODE_ENV !== "production";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";

  const state = Buffer.from(JSON.stringify({ scope: "tenant", tenantId: session.tenantId })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts offline_access",
    state
  });

  return NextResponse.redirect(`https://login.xero.com/identity/connect/authorize?${params.toString()}`);
}
