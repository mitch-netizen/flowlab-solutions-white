import type { Metadata } from "next";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { getFlowLabLogoAsset } from "@flowlab/branding";
import { ensureAppEnv } from "@flowlab/contracts/server";
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

export const metadata: Metadata = {
  title: "FlowLab Solutions",
  description: "White-label field service automation for sole operators.",
  icons: {
    icon: getFlowLabLogoAsset("favicon")
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  ensureAppEnv("web");
  return (
    <html lang="en" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
