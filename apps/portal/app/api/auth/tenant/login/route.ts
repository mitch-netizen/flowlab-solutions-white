import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, signTenantSession, verifyPassword } from "@flowlab/auth";
import { consumeRateLimit, findTenantUserInTenant, resolveTenantContext } from "@flowlab/db";
import { authLoginInputSchema, getCanonicalRootDomain, getClientIpFromRequest } from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const parsed = authLoginInputSchema.safeParse(body);

  if (!parsed.success) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const host = (await headers()).get("x-flowlab-host") ?? (await headers()).get("host");
  const tenantContext = host ? await resolveTenantContext(host) : null;

  if (!tenantContext) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Unknown tenant host" }, { status: 404 });
    }

    return NextResponse.redirect(new URL("/login?error=tenant", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "tenant_login",
    key: `tenant_login:${tenantContext.tenantId}:${getClientIpFromRequest(request)}`,
    limit: 10,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 15
  });

  if (!throttle.allowed) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 });
    }

    return NextResponse.redirect(new URL("/login?error=rate_limited", request.url), 303);
  }

  const user = await findTenantUserInTenant(parsed.data.email, tenantContext.tenantId);

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const token = signTenantSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  });

  const store = await cookies();
  store.set(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
