import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  verifyPassword,
} from "@flowlab/auth";
import {
  consumeRateLimit,
  findTenantUserInTenant,
  prisma,
  resolveTenantContext,
} from "@flowlab/db";
import {
  authLoginInputSchema,
  getClientIpFromRequest,
} from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const parsed = authLoginInputSchema.safeParse(body);
  if (!parsed.success) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
      : NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const host =
    (await headers()).get("x-flowlab-host") ??
    (await headers()).get("host");
  const tenantContext = host ? await resolveTenantContext(host) : null;

  if (!tenantContext) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Unknown tenant host" }, { status: 404 })
      : NextResponse.redirect(new URL("/login?error=tenant", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "tenant_login",
    key: `tenant_login:${tenantContext.tenantId}:${getClientIpFromRequest(request)}`,
    limit: 10,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 15,
  });

  if (!throttle.allowed) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 })
      : NextResponse.redirect(new URL("/login?error=rate_limited", request.url), 303);
  }

  const tenantUser = await findTenantUserInTenant(
    parsed.data.email,
    tenantContext.tenantId
  );

  if (!tenantUser) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
      : NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const admin = createSupabaseAdminClient();

  // ── Dual-mode: lazily migrate legacy users who haven't signed in yet ──
  if (!tenantUser.authUserId) {
    if (!tenantUser.passwordHash) {
      return contentType.includes("application/json")
        ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
        : NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
    }

    const isValid = await verifyPassword(parsed.data.password, tenantUser.passwordHash);
    if (!isValid) {
      return contentType.includes("application/json")
        ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
        : NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
    }

    // Create Supabase auth user and link it
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { scope: "tenant" },
    });

    if (createErr || !authData.user) {
      return contentType.includes("application/json")
        ? NextResponse.json({ ok: false, error: "Migration failed" }, { status: 500 })
        : NextResponse.redirect(new URL("/login?error=server", request.url), 303);
    }

    await prisma.tenantUser.update({
      where: { id: tenantUser.id },
      data: { authUserId: authData.user.id, passwordHash: null },
    });
    tenantUser.authUserId = authData.user.id;
  }

  // ── Sign in via Supabase Auth (sets sb-* session cookies) ──
  // NOTE: requires CAPTCHA to be disabled in Supabase Dashboard:
  //   Authentication → Security → Disable "Enable Captcha Protection"
  // We validate Turnstile ourselves on signup — no need for Supabase's check.
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInErr) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
      : NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  await prisma.tenantUser.update({
    where: { id: tenantUser.id },
    data: { lastLoginAt: new Date() },
  });

  return contentType.includes("application/json")
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
