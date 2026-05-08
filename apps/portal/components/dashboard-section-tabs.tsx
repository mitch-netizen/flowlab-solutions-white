"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DashboardNavItem } from "../lib/dashboard-nav";
import { isDashboardHrefActive } from "../lib/dashboard-nav";

type DashboardSectionTabsProps = {
  items: DashboardNavItem[];
};

export default function DashboardSectionTabs({ items }: DashboardSectionTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="portal-section-tabs" aria-label="Related pages">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={["portal-section-tabs__item", isDashboardHrefActive(pathname, item.href) ? "is-active" : ""].join(" ")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
