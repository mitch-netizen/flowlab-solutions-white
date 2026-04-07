import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { PLATFORM_SESSION_COOKIE, signPlatformSession, verifyPassword } from "@flowlab/auth";
import { findPlatformUser } from "@flowlab/db";

export async function POST(request: Request) {
  const body = await request.json();
  const user = await findPlatformUser(body.email);

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return NextResponse.json({ ok: true });
}
