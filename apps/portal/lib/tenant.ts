import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getBrandingTheme, toStyleAttribute } from "@flowlab/branding";
import { resolveTenantContext } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";

// Cross-request cache: host→tenant mapping is stable (changes only when a
// custom domain is added). 60s TTL keeps it fresh without hammering the DB.
const resolveTenantContextCached = unstable_cache(
  (host: string) => resolveTenantContext(host),
  ["tenant-context-by-host"],
  { revalidate: 60 }
);

const resolveCurrentTenantContext = cache(async (incomingHost: string) => {
  const host = incomingHost.replace(/^https?:\/\//, "").toLowerCase();
  const isLocal =
    host === "localhost:3001" ||
    host === "localhost" ||
    host.startsWith("127.0.0.1");

  const resolved = await resolveTenantContextCached(host);

  if (resolved) {
    return resolved;
  }

  if (isLocal) {
    return await resolveTenantContextCached(`tenant.${getCanonicalRootDomain()}`);
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
