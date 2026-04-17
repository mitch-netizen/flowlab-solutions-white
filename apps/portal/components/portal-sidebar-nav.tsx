"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNavGroups, dashboardUtilityLinks, isDashboardHrefActive } from "../lib/dashboard-nav";

// App icons — restrained glyphs to keep the sidebar easy to scan
const sectionIcon: Record<string, string> = {
  Overview: "○",
  CRM: "◇",
  Jobs: "▣",
  Revenue: "△",
  Setup: "✦"
};

type PortalSidebarNavProps = {
  showOnboardingHighlight?: boolean;
  showUpgradeHighlight?: boolean;
};

export default function PortalSidebarNav({
  showOnboardingHighlight = false,
  showUpgradeHighlight = false
}: PortalSidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {dashboardNavGroups.map((group) => {
        const isGroupActive = group.items.some((item) => isDashboardHrefActive(pathname, item.href));
        const isOnboarding = showOnboardingHighlight && group.title === "Setup";
        const isUpgrade = showUpgradeHighlight && group.title === "Setup";
        const icon = sectionIcon[group.title] ?? "·";

        return (
          <div key={group.title} className="space-y-1">
            {/* App section button — navigates to the first (primary) page of the section */}
            <Link
              href={group.items[0]!.href}
              className={[
                "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                isGroupActive ? "bg-accent text-accent-foreground border-border" : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                isOnboarding ? "ring-1 ring-amber-400/60" : "",
                isUpgrade ? "ring-1 ring-blue-400/60" : ""
              ].filter(Boolean).join(" ")}
            >
              <span className="w-4 shrink-0 text-center text-xs opacity-70">{icon}</span>
              <span className="flex-1">{group.title}</span>
              {group.items.length > 1 ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{group.items.length}</span> : null}
            </Link>

            {/* Sub-pages (visible when this section is active) */}
            {isGroupActive && group.items.length > 1 ? (
              <div className="ml-6 flex flex-col gap-1 pb-2">
                {group.items.map((item) => {
                  const isItemActive = isDashboardHrefActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={["block rounded-md px-2.5 py-1.5 text-xs", isItemActive ? "text-accent font-semibold" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="mt-3 border-t pt-3">
        {dashboardUtilityLinks.map((item) => (
          <Link key={item.href} className="block px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground" href={item.href} target="_blank" rel="noopener">
            {item.label} ↗
          </Link>
        ))}
      </div>
    </div>
  );
}
