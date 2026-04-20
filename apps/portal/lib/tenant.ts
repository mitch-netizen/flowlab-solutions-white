import { headers } from "next/headers";

import { getBrandingTheme, toStyleAttribute } from "@flowlab/branding";
import { resolveTenantContext } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";

export async function getCurrentTenantContext() {
  const incomingHost =
    (await headers()).get("x-flowlab-host") ??
    (await headers()).get("host") ??
    `tenant.${getCanonicalRootDomain()}`;

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
}

export async function getCurrentTheme() {
  const tenant = await getCurrentTenantContext();
  return getBrandingTheme(tenant);
}

export async function getCurrentThemeStyle() {
  const theme = await getCurrentTheme();
  return toStyleAttribute(theme);
}
