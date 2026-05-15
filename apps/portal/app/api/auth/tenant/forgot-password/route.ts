import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@flowlab/auth";
import { consumeRateLimit, prisma, resolveTenantContext } from "@flowlab/db";
import { getClientIpFromRequest } from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const host =
    (await headers()).get("x-flowlab-host") ??
    (await headers()).get("host");
  const tenantContext = host ? await resolveTenantContext(host) : null;

  if (!tenantContext) {
    return NextResponse.redirect(new URL("/login?error=tenant", request.url), 303);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/forgot-password?error=invalid", request.url), 303);
  }

  const throttle = await consumeRateLimit({
    scope: "tenant_forgot_password",
    key: `tenant_forgot_password:${tenantContext.tenantId}:${getClientIpFromRequest(request)}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 15,
  });

  if (!throttle.allowed) {
    return NextResponse.redirect(new URL("/forgot-password?error=rate_limited", request.url), 303);
  }

  // Look up tenant to build the redirect URL
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantContext.tenantId },
    select: { slug: true }
  });

  if (tenant) {
    const resetUrl =
      process.env.NODE_ENV === "production"
        ? `https://${tenant.slug}.flowlabsolutions.au/reset-password`
        : `http://${tenant.slug}.localhost:3001/reset-password`;

    const supabase = await createSupabaseServerClient();
    // Fire-and-forget — Supabase silently ignores unknown emails (good for security)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
  }

  // Always redirect to the "sent" page — never reveal whether the email exists
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
}
