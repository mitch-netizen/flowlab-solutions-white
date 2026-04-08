import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, signTenantSession, verifyPassword } from "@flowlab/auth";
import { findTenantUser } from "@flowlab/db";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const user = await findTenantUser(body.email);

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
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
    secure: process.env.NODE_ENV === "production"
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
