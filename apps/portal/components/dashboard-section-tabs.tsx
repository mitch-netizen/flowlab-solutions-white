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
    <nav className="flex flex-wrap gap-2" aria-label="Section navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={["inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold", isDashboardHrefActive(pathname, item.href) ? "bg-accent text-accent-foreground" : "bg-card/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground"].join(" ")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
