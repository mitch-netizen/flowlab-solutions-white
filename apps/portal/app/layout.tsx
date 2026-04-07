import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

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
  const theme = await getCurrentTheme();
  const host = (await headers()).get("host");

  return {
    title: `${theme.companyName} | Portal`,
    description: theme.tagline,
    metadataBase: host ? new URL(`http://${host}`) : undefined
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
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
      </body>
    </html>
  );
}
