import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@flowlab/auth";
import { getTenantById, prisma } from "@flowlab/db";
import { adminImpersonateSchema, buildTenantUrl } from "@flowlab/contracts/server";
import { getPlatformSession } from "../../../../lib/session";

export async function POST(request: Request) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = adminImpersonateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const tenant = await getTenantById(parsed.data.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ownerUser = tenant.users.find((u) => u.role === "owner") ?? tenant.users[0];
  if (!ownerUser) {
    return NextResponse.json({ error: "Tenant has no users to impersonate" }, { status: 400 });
  }

  if (!ownerUser.authUserId) {
    return NextResponse.json(
      { error: "Tenant owner hasn't signed in since the Supabase Auth migration — ask them to log in once first" },
      { status: 400 }
    );
  }

  // Audit log
  await prisma.platformEventLog.create({
    data: {
      tenantId: tenant.id,
      eventType: "info",
      service: "worker",
      direction: "inbound",
      status: "success",
      requestSummary: `Superadmin impersonation started`,
      responseSummary: `Admin ${session.email} (${session.sub}) is viewing as ${tenant.profile?.businessName ?? tenant.slug}`,
      triggeredBy: "superadmin_impersonate",
    },
  });

  // Tag the auth user as impersonated (read back in getTenantSession for the banner)
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(ownerUser.authUserId, {
    user_metadata: { impersonatedBy: session.sub },
  });

  // Generate a magic link for the tenant owner — the exchange endpoint will
  // verify the OTP and set the session cookie, then redirect to /dashboard
  const basePortalUrl =
    process.env.NODE_ENV !== "production"
      ? `http://${tenant.slug}.localhost:3001`
      : buildTenantUrl(tenant.slug, "");

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerUser.email,
    options: {
      redirectTo: `${basePortalUrl}/dashboard`,
    },
  });

  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: "Could not generate impersonation link" }, { status: 500 });
  }

  const exchangePath = `/api/auth/tenant/exchange?token_hash=${data.properties.hashed_token}&type=magiclink`;
  const portalUrl = `${basePortalUrl}${exchangePath}`;

  return NextResponse.json({ ok: true, portalUrl, tenantSlug: tenant.slug });
}
