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
    <div className="sidebar-nav">
      {dashboardNavGroups.map((group) => {
        const isGroupActive = group.items.some((item) => isDashboardHrefActive(pathname, item.href));
        const isOnboarding = showOnboardingHighlight && group.title === "Setup";
        const isUpgrade = showUpgradeHighlight && group.title === "Setup";
        const icon = sectionIcon[group.title] ?? "·";

        return (
          <div key={group.title} className="sidebar-app-group">
            {/* App section button — navigates to the first (primary) page of the section */}
            <Link
              href={group.items[0]!.href}
              className={[
                "sidebar-app-btn",
                isGroupActive ? "is-active" : "",
                isOnboarding ? "is-onboarding" : "",
                isUpgrade ? "is-upgrade" : ""
              ].filter(Boolean).join(" ")}
            >
              <span className="sidebar-app-icon">{icon}</span>
              <span className="sidebar-app-label">{group.title}</span>
              {group.items.length > 1 ? <span className="sidebar-app-count">{group.items.length}</span> : null}
            </Link>

            {/* Sub-pages (visible when this section is active) */}
            {isGroupActive && group.items.length > 1 ? (
              <div className="sidebar-app-pages">
                {group.items.map((item) => {
                  const isItemActive = isDashboardHrefActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-app-page${isItemActive ? " is-active" : ""}`}
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

      <div className="sidebar-utility">
        {dashboardUtilityLinks.map((item) => (
          <Link key={item.href} className="sidebar-utility-link" href={item.href} target="_blank" rel="noopener">
            {item.label} ↗
          </Link>
        ))}
      </div>
    </div>
  );
}
