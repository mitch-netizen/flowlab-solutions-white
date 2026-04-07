import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, signTenantSession } from "@flowlab/auth";
import { getTenantById, prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../lib/session";

export async function POST(request: Request) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { tenantId: string };
  if (!body.tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const tenant = await getTenantById(body.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Find the tenant owner user to impersonate
  const ownerUser = tenant.users.find((u) => u.role === "owner") ?? tenant.users[0];
  if (!ownerUser) {
    return NextResponse.json({ error: "Tenant has no users to impersonate" }, { status: 400 });
  }

  // Log the impersonation as an audit event
  await prisma.platformEventLog.create({
    data: {
      tenantId: tenant.id,
      eventType: "info",
      service: "worker",
      direction: "inbound",
      status: "success",
      requestSummary: `Superadmin impersonation started`,
      responseSummary: `Admin ${session.email} (${session.sub}) is viewing as ${tenant.profile?.businessName ?? tenant.slug}`,
      triggeredBy: "superadmin_impersonate"
    }
  });

  const tenantToken = signTenantSession({
    sub: ownerUser.id,
    email: ownerUser.email,
    scope: "tenant",
    role: ownerUser.role,
    tenantId: tenant.id,
    impersonatedBy: session.sub
  });

  // Set tenant session cookie (valid for 12h)
  const store = await cookies();
  store.set(TENANT_SESSION_COOKIE, tenantToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/"
  });

  const rootDomain = process.env.ROOT_DOMAIN ?? "localhost";
  const portalUrl =
    rootDomain === "localhost"
      ? `http://${tenant.slug}.localhost:3001/dashboard`
      : `https://${tenant.slug}.${rootDomain}/dashboard`;

  return NextResponse.json({ ok: true, portalUrl, tenantSlug: tenant.slug });
}
