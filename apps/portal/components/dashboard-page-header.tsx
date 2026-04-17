import type { ReactNode } from "react";

import type { DashboardSectionKey } from "../lib/dashboard-nav";
import { dashboardSectionTabs } from "../lib/dashboard-nav";
import DashboardSectionTabs from "./dashboard-section-tabs";

type DashboardPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  section: DashboardSectionKey;
  actions?: ReactNode;
  meta?: ReactNode;
};

export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  section,
  actions,
  meta
}: DashboardPageHeaderProps) {
  return (
    <header className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl space-y-2">
          <div className="text-xs uppercase tracking-[0.22em] text-accent">{eyebrow}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-start gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
      <DashboardSectionTabs items={dashboardSectionTabs[section]} />
    </header>
  );
}
