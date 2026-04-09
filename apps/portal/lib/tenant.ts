import { headers } from "next/headers";

import { getBrandingTheme, toStyleAttribute } from "@flowlab/branding";
import { resolveTenantContext } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";

export async function getCurrentTenantContext() {
  const host =
    (await headers()).get("x-flowlab-host") ??
    (await headers()).get("host") ??
    `tenant.${getCanonicalRootDomain()}`;
  const resolved = await resolveTenantContext(host);
  return resolved ?? null;
}

export async function getCurrentTheme() {
  const tenant = await getCurrentTenantContext();
  return getBrandingTheme(tenant);
}

export async function getCurrentThemeStyle() {
  const theme = await getCurrentTheme();
  return toStyleAttribute(theme);
}
