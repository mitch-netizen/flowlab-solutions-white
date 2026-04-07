import { headers } from "next/headers";

import { getBrandingTheme, toStyleAttribute } from "@flowlab/branding";
import { getTenantBySlug, resolveTenantContext } from "@flowlab/db";

export async function getCurrentTenantContext() {
  const host = (await headers()).get("x-flowlab-host") ?? (await headers()).get("host") ?? "quinnys.flowlabsolutions.com.au";
  const resolved = await resolveTenantContext(host);

  if (resolved) {
    return resolved;
  }

  const fallback = await getTenantBySlug("quinnys");

  if (!fallback?.profile) {
    return null;
  }

  return {
    tenantId: fallback.id,
    slug: fallback.slug,
    host,
    customDomain: fallback.profile.customDomain,
    isCustomDomain: false,
    plan: fallback.plan,
    status: fallback.status,
    branding: {
      tenantId: fallback.id,
      slug: fallback.slug,
      businessName: fallback.profile.businessName,
      tagline: fallback.profile.tagline,
      logoUrl: fallback.profile.logoUrl,
      faviconUrl: fallback.profile.faviconUrl,
      primaryColour: fallback.profile.primaryColour,
      secondaryColour: fallback.profile.secondaryColour,
      accentColour: fallback.profile.accentColour,
      fontPreference: fallback.profile.fontPreference,
      customDomain: fallback.profile.customDomain,
      customDomainVerified: fallback.profile.customDomainVerified,
      abn: fallback.profile.abn,
      phone: fallback.profile.phone,
      email: fallback.profile.email,
      address: fallback.profile.address,
      suburb: fallback.profile.suburb,
      state: fallback.profile.state,
      postcode: fallback.profile.postcode,
      serviceAreaSuburbs: fallback.profile.serviceAreaSuburbs,
      businessType: fallback.profile.businessType,
      timezone: fallback.profile.timezone
    }
  };
}

export async function getCurrentTheme() {
  const tenant = await getCurrentTenantContext();
  return getBrandingTheme(tenant);
}

export async function getCurrentThemeStyle() {
  const theme = await getCurrentTheme();
  return toStyleAttribute(theme);
}
