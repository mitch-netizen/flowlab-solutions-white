import type { ReactNode } from "react";

import DashboardPageHeader from "../dashboard-page-header";
import type { DashboardSectionKey } from "../../lib/dashboard-nav";

type DashboardPageScaffoldProps = {
  eyebrow: string;
  title: string;
  description: string;
  section: DashboardSectionKey;
  actions?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
};

type DashboardPageCardProps = {
  children: ReactNode;
  className?: string;
};

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardPageScaffold({
  eyebrow,
  title,
  description,
  section,
  actions,
  meta,
  children
}: DashboardPageScaffoldProps) {
  return (
    <div className="stack dashboard-page-scaffold">
      <DashboardPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        section={section}
        actions={actions}
        meta={meta}
      />
      <div className="dashboard-page-scaffold-content">{children}</div>
    </div>
  );
}

export function DashboardPageCard({ children, className }: DashboardPageCardProps) {
  return <section className={joinClassNames("surface", className)}>{children}</section>;
}
