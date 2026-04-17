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
    <nav className="section-tabs" aria-label="Section navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`section-tab${isDashboardHrefActive(pathname, item.href) ? " is-active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
