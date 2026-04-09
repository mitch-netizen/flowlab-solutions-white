import type { TenantContext } from "@flowlab/contracts";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";

export interface BrandingTheme {
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cssVariables: Record<string, string>;
  footerLabel: string;
}

export function getBrandingTheme(context: TenantContext | null): BrandingTheme {
  if (!context) {
    return {
      companyName: "FlowLab Solutions",
      tagline: "Your business, automated.",
      logoUrl: null,
      faviconUrl: null,
      cssVariables: {
        "--brand-primary": "#0F172A",
        "--brand-secondary": "#1E293B",
        "--brand-accent": "#3B82F6",
        "--brand-background": "#020617",
        "--brand-foreground": "#F8FAFC"
      },
      footerLabel: "Powered by FlowLab"
    };
  }

  return {
    companyName: context.branding.businessName,
    tagline: context.branding.tagline ?? "Your business, automated.",
    logoUrl: context.branding.logoUrl,
    faviconUrl: context.branding.faviconUrl,
    cssVariables: {
      "--brand-primary": context.branding.primaryColour,
      "--brand-secondary": context.branding.secondaryColour,
      "--brand-accent": context.branding.accentColour,
      "--brand-background": "#08111c",
      "--brand-foreground": "#f8fafc"
    },
    footerLabel: `${context.branding.businessName} | ${context.branding.phone ?? ""} ${context.branding.email ?? ""}`.trim()
  };
}

export function getTenantSlugFromHost(host: string) {
  const normalizedHost = host.split(":")[0].toLowerCase();
  const rootDomain = getCanonicalRootDomain();

  if (normalizedHost.endsWith(`.${rootDomain}`)) {
    return normalizedHost.replace(`.${rootDomain}`, "");
  }

  return null;
}

export function toStyleAttribute(theme: BrandingTheme) {
  return Object.entries(theme.cssVariables)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
