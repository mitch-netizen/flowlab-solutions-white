import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
  IMPERSONATION_SESSION_COOKIE,
  verifyImpersonationToken
} from "@flowlab/auth";
import { prisma, resolveTenantContext } from "@flowlab/db";
import type { TenantSession } from "@flowlab/contracts";

export async function getTenantSession(): Promise<TenantSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Resolve which tenant this request is for via the x-flowlab-host header
  // (set by middleware from the original Host header)
  const headerStore = await headers();
  const host =
    headerStore.get("x-flowlab-host") ?? headerStore.get("host") ?? "";

  const tenantContext = await resolveTenantContext(host);
  if (!tenantContext) return null;

  // Find the TenantUser that links this Supabase auth user to this tenant
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { authUserId: user.id, tenantId: tenantContext.tenantId },
  });

  if (!tenantUser) return null;

  const cookieStore = await cookies();
  const rawImpersonationToken = cookieStore.get(IMPERSONATION_SESSION_COOKIE)?.value;
  let impersonatedBy: string | undefined;

  if (rawImpersonationToken) {
    const impersonation = verifyImpersonationToken(rawImpersonationToken);
    const tokenMatchesSession =
      impersonation &&
      impersonation.authUserId === user.id &&
      impersonation.tenantId === tenantContext.tenantId;

    if (!tokenMatchesSession) {
      await supabase.auth.signOut();
      cookieStore.delete(IMPERSONATION_SESSION_COOKIE);
      return null;
    }

    impersonatedBy = impersonation.adminUserId;
  }

  return {
    sub: tenantUser.id,
    authUserId: user.id,
    email: tenantUser.email,
    scope: "tenant",
    role: tenantUser.role,
    tenantId: tenantUser.tenantId,
    impersonatedBy: impersonatedBy ?? undefined,
  } satisfies TenantSession;
}

export async function requireTenantSession() {
  const session = await getTenantSession();
  if (!session) redirect("/login");
  return session;
}
