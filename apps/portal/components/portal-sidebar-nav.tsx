"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNavGroups, dashboardUtilityLinks, isDashboardHrefActive } from "../lib/dashboard-nav";

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
      {dashboardNavGroups.map((group) => (
        <div key={group.title} className="sidebar-nav-group">
          <Link
            href={group.items[0]!.href}
            className={`sidebar-section-link${group.items.some((item) => isDashboardHrefActive(pathname, item.href)) ? " is-active" : ""}${
              showOnboardingHighlight && group.title === "Setup" ? " is-onboarding" : ""
            }${
              showUpgradeHighlight && group.title === "Setup" ? " is-upgrade" : ""
            }`}
          >
            {group.title}
          </Link>
        </div>
      ))}

      <div className="sidebar-nav-group">
        {dashboardUtilityLinks.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} className={`sidebar-section-link sidebar-section-link-secondary${isActive ? " is-active" : ""}`} href={item.href}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
