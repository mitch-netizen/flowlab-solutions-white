import { headers } from "next/headers";
import { cache } from "react";

import { getBrandingTheme, toStyleAttribute } from "@flowlab/branding";
import { resolveTenantContext } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";

const resolveCurrentTenantContext = cache(async (incomingHost: string) => {
  const host = incomingHost.replace(/^https?:\/\//, "").toLowerCase();
  const isLocal =
    host === "localhost:3001" ||
    host === "localhost" ||
    host.startsWith("127.0.0.1");

  const resolved = await resolveTenantContext(host);

  if (resolved) {
    return resolved;
  }

  if (isLocal) {
    return await resolveTenantContext(`tenant.${getCanonicalRootDomain()}`);
  }

  return null;
});

export async function getCurrentTenantContext() {
  const headerStore = await headers();
  const incomingHost =
    headerStore.get("x-flowlab-host") ??
    headerStore.get("host") ??
    `tenant.${getCanonicalRootDomain()}`;

  return resolveCurrentTenantContext(incomingHost);
}

export const getCurrentTheme = cache(async () => {
  const tenant = await getCurrentTenantContext();
  return getBrandingTheme(tenant);
});

export async function getCurrentThemeStyle() {
  const theme = await getCurrentTheme();
  return toStyleAttribute(theme);
}
