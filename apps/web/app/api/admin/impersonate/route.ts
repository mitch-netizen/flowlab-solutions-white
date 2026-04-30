import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  IMPERSONATION_NONCE_COOKIE,
  IMPERSONATION_OTP_TYPE_COOKIE,
  IMPERSONATION_TOKEN_HASH_COOKIE,
  signImpersonationToken
} from "@flowlab/auth";
import { createImpersonationNonce, getTenantById, prisma, consumeRateLimit } from "@flowlab/db";
import { adminImpersonateSchema, buildTenantUrl, getCanonicalRootDomain } from "@flowlab/contracts/server";
import { getPlatformSession } from "../../../../lib/session";

// 30-minute TTL for impersonation sessions
const IMPERSONATION_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate-limit: max 10 impersonation attempts per admin per hour
  const throttle = await consumeRateLimit({
    scope: "admin_impersonate",
    key: `admin_impersonate:${session.sub}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });
  if (!throttle.allowed) {
    return NextResponse.json({ error: "Too many impersonation attempts. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminImpersonateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const tenant = await getTenantById(parsed.data.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ownerUser = tenant.users.find((u) => u.role === "owner") ?? tenant.users[0];
  if (!ownerUser) {
    return NextResponse.json({ error: "Tenant has no users to impersonate" }, { status: 400 });
  }

  if (!ownerUser.authUserId) {
    return NextResponse.json(
      { error: "Tenant owner hasn't signed in since the Supabase Auth migration — ask them to log in once first" },
      { status: 400 }
    );
  }

  // Audit log
  await prisma.platformEventLog.create({
    data: {
      tenantId: tenant.id,
      eventType: "info",
      service: "worker",
      direction: "inbound",
      status: "success",
      requestSummary: `Superadmin impersonation started`,
      responseSummary: `Admin ${session.email} (${session.sub}) is viewing as ${tenant.profile?.businessName ?? tenant.slug}`,
      triggeredBy: "superadmin_impersonate",
    },
  });

  const admin = createSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS).toISOString();
  const impersonationToken = signImpersonationToken({
    adminUserId: session.sub,
    authUserId: ownerUser.authUserId,
    tenantId: tenant.id,
    expiresAt
  });
  const nonce = await createImpersonationNonce({
    token: impersonationToken,
    expiresAt
  });

  // Generate a magic link for the tenant owner — the exchange endpoint will
  // verify the OTP and set the session cookie, then redirect to /dashboard
  const basePortalUrl =
    process.env.NODE_ENV !== "production"
      ? `http://${tenant.slug}.localhost:3001`
      : buildTenantUrl(tenant.slug, "");

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerUser.email,
    options: {
      redirectTo: `${basePortalUrl}/dashboard`,
    },
  });

  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: "Could not generate impersonation link" }, { status: 500 });
  }

  const exchangePath = "/api/auth/tenant/exchange";
  const portalUrl = `${basePortalUrl}${exchangePath}`;

  const response = NextResponse.json({ ok: true, portalUrl, tenantSlug: tenant.slug });
  const cookieDomain = process.env.NODE_ENV === "production" ? `.${getCanonicalRootDomain()}` : "localhost";
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: exchangePath,
    maxAge: Math.ceil(IMPERSONATION_TTL_MS / 1000),
    domain: cookieDomain
  };
  response.cookies.set(IMPERSONATION_TOKEN_HASH_COOKIE, data.properties.hashed_token, cookieOptions);
  response.cookies.set(IMPERSONATION_OTP_TYPE_COOKIE, "magiclink", cookieOptions);
  response.cookies.set(IMPERSONATION_NONCE_COOKIE, nonce, cookieOptions);
  return response;
}
