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
    <header className="dashboard-page-header">
      <div className="dashboard-page-header-main">
        <div className="dashboard-page-header-copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="dashboard-page-header-actions">{actions}</div> : null}
      </div>
      {meta ? <div className="dashboard-page-header-meta">{meta}</div> : null}
      <DashboardSectionTabs items={dashboardSectionTabs[section]} />
    </header>
  );
}
