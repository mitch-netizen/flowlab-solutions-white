/**
 * Impersonation token exchange endpoint.
 * Superadmin impersonation generates a Supabase magic-link OTP.
 * This route verifies it and sets the session cookie, then redirects to /dashboard.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@flowlab/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "recovery" | null;

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

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
