import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import type { TenantSession } from "@flowlab/contracts";

export async function getTenantSession(): Promise<TenantSession | null> {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  return session?.scope === "tenant" && session.tenantId ? (session as TenantSession) : null;
}

export async function requireTenantSession() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
