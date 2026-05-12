import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  createSupabaseServerClient,
  IMPERSONATION_SESSION_COOKIE,
  verifyImpersonationToken
} from "@flowlab/auth";
import { prisma } from "@flowlab/db";
import type { TenantSession } from "@flowlab/contracts";

import { getCurrentTenantContext } from "./tenant";

// cache() deduplicates calls within the same request render tree —
// layout + page both call requireTenantSession() but only one DB round-trip fires.
export const getTenantSession = cache(async (): Promise<TenantSession | null> => {
  const supabase = await createSupabaseServerClient();

  // Parallelise: auth token validation and tenant context resolution are independent.
  const [{ data: { user }, error }, tenantContext] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentTenantContext()
  ]);

  if (error || !user || !tenantContext) return null;

  // Find the TenantUser that links this Supabase auth user to this tenant
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { authUserId: user.id, tenantId: tenantContext.tenantId }
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
});

export async function requireTenantSession() {
  const session = await getTenantSession();
  if (!session) redirect("/login");
  return session;
}
