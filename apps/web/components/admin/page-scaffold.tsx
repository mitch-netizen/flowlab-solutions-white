import type { ReactNode } from "react";

import { FlowLabBrandLink } from "../flowlab-brand";

type AdminPageScaffoldProps = {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

type AdminCardProps = {
  children: ReactNode;
  className?: string;
};

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminPageScaffold({ title, description, meta, actions, children }: AdminPageScaffoldProps) {
  return (
    <main className="shell admin-page-scaffold">
      <div className="app-topbar">
        <FlowLabBrandLink />
        <span className="app-topbar__label">Platform</span>
      </div>
      <section className="grid admin-page-scaffold-grid">
        <header className="hero-card admin-page-header">
          <div>
            <h1>{title}</h1>
            {description ? <p className="muted">{description}</p> : null}
            {meta ? <div className="muted">{meta}</div> : null}
          </div>
          {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
        </header>
        {children}
      </section>
    </main>
  );
}

export function AdminPageCard({ children, className }: AdminCardProps) {
  return <section className={joinClassNames("panel", className)}>{children}</section>;
}
