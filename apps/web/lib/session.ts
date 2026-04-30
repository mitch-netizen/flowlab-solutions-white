import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@flowlab/auth";
import { prisma, resolveTenantContext } from "@flowlab/db";
import type { PlatformSession, TenantSession } from "@flowlab/contracts";

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Verify this Supabase auth user is actually a PlatformUser
  const platformUser = await prisma.platformUser.findFirst({
    where: { authUserId: user.id },
  });

  if (!platformUser) return null;

  return {
    sub: platformUser.id,
    authUserId: user.id,
    email: platformUser.email,
    scope: "platform",
    role: platformUser.role,
  } satisfies PlatformSession;
}

export async function requirePlatformSession() {
  const session = await getPlatformSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireTenantSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const headerStore = await headers();
  const host = headerStore.get("x-flowlab-host") ?? headerStore.get("host") ?? "";
  const tenantContext = await resolveTenantContext(host);
  if (!tenantContext) redirect("/login");

  const tenantUser = await prisma.tenantUser.findFirst({
    where: { authUserId: user.id, tenantId: tenantContext.tenantId },
  });

  if (!tenantUser) redirect("/login");

  return {
    sub: tenantUser.id,
    authUserId: user.id,
    email: tenantUser.email,
    scope: "tenant",
    role: tenantUser.role,
    tenantId: tenantUser.tenantId,
  } satisfies TenantSession;
}
