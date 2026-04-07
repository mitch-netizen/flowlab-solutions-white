import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, signTenantSession, verifyPassword } from "@flowlab/auth";
import { findTenantUser } from "@flowlab/db";

export async function POST(request: Request) {
  const body = await request.json();
  const user = await findTenantUser(body.email);

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return NextResponse.json({ ok: true });
}
