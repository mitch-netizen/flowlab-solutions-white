import { NextResponse } from "next/server";

import { requirePlatformSession } from "../../../../../lib/session";

export async function GET() {
  const session = await requirePlatformSession();
  const isLocal = process.env.NODE_ENV !== "production";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";
  const clientId = process.env.XERO_CLIENT_ID || "";

  if (!clientId) {
    return NextResponse.json({ error: "Xero Client ID not configured" }, { status: 400 });
  }

  const state = Buffer.from(JSON.stringify({
    scope: "platform",
    platformUserId: session.sub
  })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts offline_access",
    state
  });

  return NextResponse.redirect(`https://login.xero.com/identity/connect/authorize?${params.toString()}`);
}
