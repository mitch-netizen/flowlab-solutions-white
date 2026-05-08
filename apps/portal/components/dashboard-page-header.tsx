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
    <header className="portal-page-header">
      <div className="portal-page-header__top">
        <div className="portal-page-header__copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="portal-page-header__actions">{actions}</div> : null}
      </div>
      {meta ? <div className="portal-page-header__meta">{meta}</div> : null}
      <DashboardSectionTabs items={dashboardSectionTabs[section]} />
    </header>
  );
}
