import { requireTenantSession } from "../../../../../lib/session";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveIntegrationCredentials } from "@flowlab/db";

/**
 * GET — Begin Xero OAuth flow.
 * Redirects user to Xero's authorization page.
 */
export async function GET(request: Request) {
  const session = await requireTenantSession();

  const { credentials } = await resolveIntegrationCredentials({
    tenantId: session.tenantId,
    service: "xero",
    envFallback: {
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET
    }
  });
  const clientId = credentials.clientId || process.env.XERO_CLIENT_ID || "";

  if (!clientId) {
    return NextResponse.json(
      { error: "FlowLab Xero app credentials are not configured yet." },
      { status: 400 }
    );
  }

  const isLocal = process.env.NODE_ENV !== "production";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";

  const csrfToken = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("xero_oauth_csrf", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });

  const state = Buffer.from(JSON.stringify({ tenantId: session.tenantId, csrf: csrfToken })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts offline_access",
    state
  });

  return NextResponse.redirect(`https://login.xero.com/identity/connect/authorize?${params.toString()}`);
}
