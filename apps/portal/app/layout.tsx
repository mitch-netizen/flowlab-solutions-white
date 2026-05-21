import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ensureAppEnv } from "@flowlab/contracts/server";
import { getFlowLabLogoAsset } from "@flowlab/branding";
import { getCurrentTheme } from "../lib/tenant";
import "./globals.css";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading"
});

const monoFont = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export async function generateMetadata(): Promise<Metadata> {
  ensureAppEnv("portal");
  const theme = await getCurrentTheme();
  const host = (await headers()).get("host");
  const protocol = (await headers()).get("x-forwarded-proto") ?? "https";

  return {
    title: `${theme.companyName} | Portal`,
    description: theme.tagline,
    metadataBase: host ? new URL(`${protocol}://${host}`) : undefined,
    icons: {
      icon: theme.faviconUrl ?? getFlowLabLogoAsset("favicon")
    }
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  ensureAppEnv("portal");
  const theme = await getCurrentTheme();

  return (
    <html lang="en" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body
        style={{
          ["--brand-primary" as string]: theme.cssVariables["--brand-primary"],
          ["--brand-secondary" as string]: theme.cssVariables["--brand-secondary"],
          ["--brand-accent" as string]: theme.cssVariables["--brand-accent"],
          ["--brand-background" as string]: theme.cssVariables["--brand-background"],
          ["--brand-foreground" as string]: theme.cssVariables["--brand-foreground"]
        }}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
