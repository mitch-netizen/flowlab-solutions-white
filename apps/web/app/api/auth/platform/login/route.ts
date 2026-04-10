import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  PLATFORM_SESSION_COOKIE,
  verifyPassword,
} from "@flowlab/auth";
import { consumeRateLimit, findPlatformUser, prisma } from "@flowlab/db";
import {
  authLoginInputSchema,
  getClientIpFromRequest,
} from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const rawBody = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const parsed = authLoginInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
      : NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "platform_login",
    key: `platform_login:${getClientIpFromRequest(request)}`,
    limit: 10,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 15,
  });

  if (!throttle.allowed) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 })
      : NextResponse.redirect(new URL("/admin/login?error=rate_limited", request.url), 303);
  }

  const platformUser = await findPlatformUser(parsed.data.email);
  if (!platformUser) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  // ── Dual-mode: lazily migrate legacy platform users ──
  if (!platformUser.authUserId) {
    if (!platformUser.passwordHash) {
      return contentType.includes("application/json")
        ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
    }

    const isValid = await verifyPassword(
      parsed.data.password,
      platformUser.passwordHash
    );
    if (!isValid) {
      return contentType.includes("application/json")
        ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
    }

    const admin = createSupabaseAdminClient();
    const { data: authData, error: createErr } =
      await admin.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { scope: "platform" },
      });

    if (!createErr && authData.user) {
      await prisma.platformUser.update({
        where: { id: platformUser.id },
        data: { authUserId: authData.user.id, passwordHash: null },
      });
      platformUser.authUserId = authData.user.id;
    }
  }

  // ── Sign in via Supabase Auth ──
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInErr) {
    return contentType.includes("application/json")
      ? NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  // Update lastLoginAt
  await prisma.platformUser.update({
    where: { id: platformUser.id },
    data: { lastLoginAt: new Date() },
  });

  // Clean up legacy cookie if present
  (await cookies()).delete(PLATFORM_SESSION_COOKIE);

  return contentType.includes("application/json")
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/admin", request.url), 303);
}
