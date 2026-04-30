import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPlatformSession } from "../../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isLocal = process.env.NODE_ENV !== "production";
  const redirectUri = isLocal
    ? "http://localhost:3000/api/integrations/xero/callback"
    : process.env.XERO_REDIRECT_URI ?? "https://flowlabsolutions.au/api/integrations/xero/callback";
  const clientId = process.env.XERO_CLIENT_ID || "";

  if (!clientId) {
    return NextResponse.json({ error: "Xero Client ID not configured" }, { status: 400 });
  }

  const csrfToken = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("xero_oauth_csrf", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });

  const state = Buffer.from(JSON.stringify({
    scope: "platform",
    platformUserId: session.sub,
    csrf: csrfToken
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
