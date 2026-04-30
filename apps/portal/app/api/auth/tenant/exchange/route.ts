/**
 * Impersonation token exchange endpoint.
 * Superadmin impersonation generates a Supabase magic-link OTP.
 * This route verifies it and sets the session cookie, then redirects to /dashboard.
 */
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  IMPERSONATION_NONCE_COOKIE,
  IMPERSONATION_OTP_TYPE_COOKIE,
  IMPERSONATION_SESSION_COOKIE,
  IMPERSONATION_TOKEN_HASH_COOKIE,
  verifyImpersonationToken
} from "@flowlab/auth";
import { consumeImpersonationNonce, resolveTenantContext } from "@flowlab/db";

export async function GET(request: Request) {
  const store = await cookies();
  const tokenHash = store.get(IMPERSONATION_TOKEN_HASH_COOKIE)?.value;
  const type = store.get(IMPERSONATION_OTP_TYPE_COOKIE)?.value as "magiclink" | "recovery" | null;
  const impersonationNonce = store.get(IMPERSONATION_NONCE_COOKIE)?.value;
  store.delete(IMPERSONATION_TOKEN_HASH_COOKIE);
  store.delete(IMPERSONATION_OTP_TYPE_COOKIE);
  store.delete(IMPERSONATION_NONCE_COOKIE);

  if (!tokenHash || !type || !impersonationNonce) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  const impersonationToken = await consumeImpersonationNonce(impersonationNonce);
  if (!impersonationToken) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  const parsed = verifyImpersonationToken(impersonationToken);
  if (!parsed) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  const headerStore = await headers();
  const host = headerStore.get("x-flowlab-host") ?? headerStore.get("host") ?? "";
  const tenantContext = host ? await resolveTenantContext(host) : null;
  if (!tenantContext || tenantContext.tenantId !== parsed.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  store.set(IMPERSONATION_SESSION_COOKIE, impersonationToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
