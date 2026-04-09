import Link from "next/link";
import type { ReactNode } from "react";

import { prisma } from "@flowlab/db";
import TenantUnavailable from "../../components/tenant-unavailable";
import { getCurrentTenantContext } from "../../lib/tenant";
import { getTenantSession, requireTenantSession } from "../../lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireTenantSession();
  const tenant = await getCurrentTenantContext();

  if (!tenant) {
    return <TenantUnavailable title="Tenant dashboard unavailable" message="Your session is valid, but this host is not mapped to your tenant. Sign in through the correct tenant domain." />;
  }

  // Onboarding completion status
  const tenantUser = session?.sub
    ? await prisma.tenantUser.findUnique({ where: { id: session.sub } })
    : null;
  const onboardingComplete = tenantUser?.onboardingCompleted ?? false;
  const onboardingStep = tenantUser?.onboardingStep ?? 1;

  const isImpersonating = !!session?.impersonatedBy;

  return (
    <>
      {/* Impersonation banner — shown when a superadmin is viewing as this tenant */}
      {isImpersonating && (
        <div style={{
          background: "#7c3aed",
          color: "#fff",
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 500,
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16
        }}>
          <span>
            ⚡ Superadmin view — you are browsing as <strong>{tenant.branding.businessName}</strong>
          </span>
          <a href="/api/auth/tenant/logout" style={{ color: "#e9d5ff", textDecoration: "underline", fontSize: 13 }}>
            Exit impersonation
          </a>
        </div>
      )}

      {/* Onboarding incomplete banner */}
      {!onboardingComplete && (
        <div style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap"
        }}>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>
            ⚡ Complete your setup to activate automations
          </span>
          <Link
            href="/dashboard/onboarding"
            style={{
              color: "#3b82f6",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap"
            }}
          >
            Continue setup (Step {onboardingStep} of 6) →
          </Link>
        </div>
      )}

      <main className="portal-shell">
        <aside className="sidebar">
          <div className="eyebrow">{tenant.branding.businessName}</div>
          <h2 style={{ marginTop: 8 }}>{tenant.branding.tagline ?? "Your business, automated."}</h2>
          <p style={{ color: "#cbd5e1" }}>Plan: {tenant.plan}</p>
          <nav style={{ marginTop: 28 }}>
            <Link className="nav-link" href="/dashboard">
              Overview
            </Link>
            <Link className="nav-link" href="/dashboard/quotes">
              AI quoting
            </Link>
            <Link className="nav-link" href="/dashboard/agreements">
              Agreements
            </Link>
            <Link className="nav-link" href="/dashboard/crm">
              CRM
            </Link>
            <Link className="nav-link" href="/dashboard/scheduler">
              Scheduler
            </Link>
            <Link className="nav-link" href="/dashboard/mobile">
              Mobile job app
            </Link>
            <Link className="nav-link" href="/dashboard/retention">
              Retention
            </Link>
            <Link className="nav-link" href="/dashboard/invoices">
              Invoices
            </Link>
            {!onboardingComplete && (
              <Link className="nav-link" href="/dashboard/onboarding" style={{ color: "#f59e0b" }}>
                ⚡ Onboarding
              </Link>
            )}
            <Link className="nav-link" href="/dashboard/integrations">
              Integrations
            </Link>
            <Link className="nav-link" href="/dashboard/system-health">
              System health
            </Link>
            <Link className="nav-link" href="/dashboard/settings">
              Settings
            </Link>
            <Link className="nav-link" href="/enquiry">
              Customer enquiry
            </Link>
          </nav>
        </aside>
        <section>{children}</section>
      </main>
    </>
  );
}
