/**
 * Impersonation token exchange endpoint.
 * Superadmin impersonation generates a Supabase magic-link OTP.
 * This route verifies it and sets the session cookie, then redirects to /dashboard.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  IMPERSONATION_SESSION_COOKIE,
  verifyImpersonationToken
} from "@flowlab/auth";
import { consumeImpersonationNonce } from "@flowlab/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "recovery" | null;
  const impersonationNonce = searchParams.get("impersonation_nonce");

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
  }

  if (impersonationNonce) {
    const impersonationToken = await consumeImpersonationNonce(impersonationNonce);
    if (!impersonationToken) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
    }

    const parsed = verifyImpersonationToken(impersonationToken);
    if (!parsed) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url), 303);
    }

    const store = await cookies();
    store.set(IMPERSONATION_SESSION_COOKIE, impersonationToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  } else {
    (await cookies()).delete(IMPERSONATION_SESSION_COOKIE);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
