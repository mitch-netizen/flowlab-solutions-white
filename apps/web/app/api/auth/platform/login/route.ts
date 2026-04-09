import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { PLATFORM_SESSION_COOKIE, signPlatformSession, verifyPassword } from "@flowlab/auth";
import { consumeRateLimit, findPlatformUser } from "@flowlab/db";
import { authLoginInputSchema, getClientIpFromRequest } from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const rawBody = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const parsed = authLoginInputSchema.safeParse(rawBody);

  if (!parsed.success) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "platform_login",
    key: `platform_login:${getClientIpFromRequest(request)}`,
    limit: 10,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 15
  });

  if (!throttle.allowed) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 });
    }

    return NextResponse.redirect(new URL("/admin/login?error=rate_limited", request.url), 303);
  }

  const user = await findPlatformUser(parsed.data.email);

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  const token = signPlatformSession({
    sub: user.id,
    email: user.email,
    role: user.role
  });

  const store = await cookies();
  store.set(PLATFORM_SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
