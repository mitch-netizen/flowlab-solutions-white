import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { resolveTenantContext } from "@flowlab/db";
import type { TenantSession } from "@flowlab/contracts";

export async function getTenantSession(): Promise<TenantSession | null> {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return null;
  }

  const host = (await headers()).get("x-flowlab-host") ?? (await headers()).get("host");
  if (host) {
    const tenantContext = await resolveTenantContext(host);
    if (!tenantContext || tenantContext.tenantId !== session.tenantId) {
      return null;
    }
  }

  return session as TenantSession;
}

export async function requireTenantSession() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
