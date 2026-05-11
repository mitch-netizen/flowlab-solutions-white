"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNavGroups, dashboardUtilityLinks, isDashboardHrefActive } from "../lib/dashboard-nav";

// App icons — restrained glyphs to keep the sidebar easy to scan
const sectionIcon: Record<string, string> = {
  Today: "○",
  Leads: "◇",
  Quotes: "◆",
  Jobs: "▣",
  Money: "△",
  Settings: "✦"
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
    <div className="portal-nav">
      {dashboardNavGroups.map((group) => {
        const isGroupActive = group.items.some((item) => isDashboardHrefActive(pathname, item.href));
        const isOnboarding = showOnboardingHighlight && group.title === "Settings";
        const isUpgrade = showUpgradeHighlight && group.title === "Settings";
        const icon = sectionIcon[group.title] ?? "·";

        return (
          <div key={group.title} className="portal-nav__group">
            {/* App section button — navigates to the first (primary) page of the section */}
            <Link
              href={group.items[0]!.href}
              className={[
                "portal-nav__primary",
                isGroupActive ? "is-active" : "",
                isOnboarding ? "is-warning" : "",
                isUpgrade ? "is-upgrade" : ""
              ].filter(Boolean).join(" ")}
            >
              <span className="w-4 shrink-0 text-center text-xs opacity-70">{icon}</span>
              <span className="flex-1">{group.title}</span>
              {group.items.length > 1 ? <span className="portal-nav__count">{group.items.length}</span> : null}
            </Link>

            {/* Sub-pages (visible when this section is active) */}
            {isGroupActive && group.items.length > 1 ? (
              <div className="portal-nav__subpages">
                {group.items.map((item) => {
                  const isItemActive = isDashboardHrefActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={["portal-nav__subpage", isItemActive ? "is-active" : ""].join(" ")}
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

      <div className="portal-nav__utility">
        {dashboardUtilityLinks.map((item) => (
          <Link key={item.href} className="portal-nav__utility-link" href={item.href} target="_blank" rel="noopener">
            {item.label} ↗
          </Link>
        ))}
      </div>
    </div>
  );
}
