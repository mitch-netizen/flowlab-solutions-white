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

function buildSemanticTokens(accentPrimary: string, accentSecondary: string) {
  return {
    "--app-bg": "#1f2632",
    "--surface-1": "color-mix(in srgb, var(--app-bg) 88%, black)",
    "--surface-2": "color-mix(in srgb, var(--app-bg) 76%, black)",
    "--text-primary": "#e1e1e1",
    "--text-secondary": "#676767",
    "--accent-primary": accentPrimary,
    "--accent-secondary": accentSecondary,
    "--border-subtle": "color-mix(in srgb, var(--text-primary) 20%, transparent)",
    "--radius-sm": "4px",
    "--radius-md": "8px",
    "--radius-lg": "12px",
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "20px",
    "--space-6": "24px",
    "--space-7": "28px",
    "--space-8": "32px",
    "--shadow-sm": "0 12px 36px color-mix(in srgb, var(--app-bg) 80%, black)",
    "--shadow-md": "0 18px 52px color-mix(in srgb, var(--app-bg) 84%, black)",
    "--gradient-primary": "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    /* Compatibility mapping: keep --brand-* alive */
    "--brand-primary": "var(--app-bg)",
    "--brand-secondary": "var(--surface-1)",
    "--brand-accent": "var(--accent-primary)",
    "--brand-background": "var(--app-bg)",
    "--brand-foreground": "var(--text-primary)",
    /* Existing aliases retained */
    "--background": "var(--app-bg)",
    "--foreground": "var(--text-primary)",
    "--card": "var(--surface-1)",
    "--muted-foreground": "var(--text-secondary)",
    "--border": "var(--border-subtle)",
    "--primary": "var(--accent-primary)",
    "--primary-foreground": "var(--app-bg)",
    "--secondary": "var(--surface-2)",
    "--secondary-foreground": "var(--text-primary)",
    "--accent": "color-mix(in srgb, var(--accent-primary) 18%, var(--surface-2))",
    "--accent-foreground": "var(--text-primary)"
  };
}

export type FlowLabLogoContext = "dark" | "light" | "small" | "favicon";

export const FLOWLAB_LOGO_PNG = {
  dark: "/brand/logos/primary-on-dark.png",
  light: "/brand/logos/primary-on-light.png",
  small: "/brand/logos/solutions-icon.png",
  favicon: "/brand/logos/favicon.png"
} as const;

/* SVG placeholder paths for future swap-in (no runtime imports):
  /brand/logos/primary-on-dark.svg
  /brand/logos/primary-on-light.svg
  /brand/logos/solutions-icon.svg
  /brand/logos/favicon.svg
*/

export function getFlowLabLogoAsset(context: FlowLabLogoContext): string {
  return FLOWLAB_LOGO_PNG[context];
}

export function getBrandingTheme(context: TenantContext | null): BrandingTheme {
  const accentPrimary = context?.branding.accentColour ?? "#00b4a1";
  const accentSecondary = context?.branding.secondaryColour ?? "#04a9ba";

  if (!context) {
    return {
      companyName: "FlowLab Solutions",
      tagline: "Your business, automated.",
      logoUrl: null,
      faviconUrl: null,
      cssVariables: buildSemanticTokens(accentPrimary, accentSecondary),
      footerLabel: "Powered by FlowLab"
    };
  }

  return {
    companyName: context.branding.businessName,
    tagline: context.branding.tagline ?? "Your business, automated.",
    logoUrl: context.branding.logoUrl,
    faviconUrl: context.branding.faviconUrl,
    cssVariables: buildSemanticTokens(accentPrimary, accentSecondary),
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
