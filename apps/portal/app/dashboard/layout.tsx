import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { prisma } from "@flowlab/db";
import { getPlanFeatures } from "@flowlab/contracts";
import TenantUnavailable from "../../components/tenant-unavailable";
import PortalSidebarNav from "../../components/portal-sidebar-nav";
import { getCurrentTenantContext } from "../../lib/tenant";
import { requireTenantSession } from "../../lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireTenantSession();
  const tenant = await getCurrentTenantContext();

  if (!tenant) {
    return <TenantUnavailable title="Tenant dashboard unavailable" message="Your session is valid, but this host is not mapped to your tenant. Sign in through the correct tenant domain." />;
  }

  const [tenantUser, tenantRecord] = await Promise.all([
    session?.sub
      ? prisma.tenantUser.findUnique({ where: { id: session.sub } })
      : Promise.resolve(null),
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { status: true, plan: true, trialEndsAt: true }
    })
  ]);

  const onboardingComplete = tenantUser?.onboardingCompleted ?? false;
  const onboardingStep = tenantUser?.onboardingStep ?? 1;
  const isImpersonating = !!session?.impersonatedBy;

  const status = tenantRecord?.status ?? "trial";
  const plan = tenantRecord?.plan ?? tenant.plan;
  const trialEndsAt = tenantRecord?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialExpiringSoon = trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 5;
  const features = getPlanFeatures(plan as Parameters<typeof getPlanFeatures>[0]);

  const isSuspended = status === "suspended" || status === "cancelled";

  // Redirect suspended/cancelled tenants to the upgrade page.
  // Read x-pathname (set by middleware) to avoid an infinite redirect loop
  // when the user is already on the upgrade page.
  if (isSuspended) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-pathname") ?? "";
    if (pathname !== "/dashboard/upgrade") {
      redirect("/dashboard/upgrade");
    }
  }

  return (
    <>
      {/* Impersonation banner */}
      {isImpersonating && (
        <div style={{
          background: "#7c3aed", color: "#fff",
          padding: "10px 24px", textAlign: "center",
          fontSize: 14, fontWeight: 500,
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16
        }}>
          <span>⚡ Superadmin view — you are browsing as <strong>{tenant.branding.businessName}</strong></span>
          <a href="/api/auth/tenant/logout" style={{ color: "#e9d5ff", textDecoration: "underline", fontSize: 13 }}>
            Exit impersonation
          </a>
        </div>
      )}

      {/* Suspended / cancelled banner */}
      {isSuspended && (
        <div style={{
          background: "#7f1d1d", color: "#fecaca",
          padding: "12px 24px", textAlign: "center",
          fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap"
        }}>
          <span>
            {status === "cancelled" ? "Your account has been cancelled." : "Your account is suspended."}
            {" "}Some features are unavailable.
          </span>
          <Link href="/dashboard/upgrade" style={{ color: "#fca5a5", textDecoration: "underline" }}>
            View options →
          </Link>
        </div>
      )}

      {/* Trial expired banner */}
      {!isSuspended && trialExpired && (
        <div style={{
          background: "#7f1d1d", color: "#fecaca",
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap"
        }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Your 14-day trial has ended. Upgrade to keep all your automations and data running.
          </span>
          <Link href="/dashboard/upgrade" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" style={{ fontSize: 13, padding: "8px 16px", background: "#dc2626", border: "none" }}>
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Trial expiring soon banner */}
      {!isSuspended && !trialExpired && trialExpiringSoon && (
        <div style={{
          background: "#78350f", color: "#fde68a",
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap"
        }}>
          <span style={{ fontSize: 14 }}>
            {trialDaysLeft === 1 ? "Last day of your trial." : `${trialDaysLeft} days left in your trial.`}
            {" "}All your data and automations will pause when it ends.
          </span>
          <Link href="/dashboard/upgrade" style={{ color: "#fde68a", fontWeight: 700, fontSize: 13 }}>
            Upgrade to keep going →
          </Link>
        </div>
      )}

      {/* Onboarding incomplete banner */}
      {!onboardingComplete && (
        <div style={{
          background: "#1e293b", borderBottom: "1px solid #334155",
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap"
        }}>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>⚡ Complete your setup to activate automations</span>
          <Link href="/dashboard/onboarding" style={{ color: "#3b82f6", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            Continue setup (Step {onboardingStep} of 6) →
          </Link>
        </div>
      )}

      <main className="grid gap-4 xl:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="sticky top-4 h-fit space-y-4 rounded-lg border bg-card p-4">
          <div className="space-y-2">
            <div className="eyebrow">Your workspace</div>
            <h2 style={{ margin: "6px 0 4px", lineHeight: 1.08 }}>{tenant.branding.businessName}</h2>
            <div style={{ color: "#cbd5e1", fontSize: 15, fontWeight: 600 }}>
              {tenant.branding.tagline ?? "Your business, automated."}
            </div>
            <p className="text-xs text-muted-foreground">
              Daily control for enquiries, quoting, jobs, invoices, and follow-up.
            </p>
          </div>

          <div className="rounded-lg border bg-card/70 p-3">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: status === "trial" ? "#1e3a5f" : status === "active" ? "#14532d" : "#3f1515",
                color: status === "trial" ? "#93c5fd" : status === "active" ? "#86efac" : "#fca5a5"
              }}>
              {status === "trial"
                ? trialExpired
                  ? "Trial ended"
                  : trialDaysLeft !== null
                    ? `Trial — ${trialDaysLeft}d left`
                    : "Trial"
                : status}
              </span>
              <span style={{ color: "#64748b", fontSize: 12, textTransform: "capitalize" }}>
                {plan}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>
              {!onboardingComplete
                ? `Setup in progress · Step ${onboardingStep} of 6`
                : "Setup complete"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {features.jobsPerMonth !== null
                ? `Up to ${features.jobsPerMonth} jobs / month`
                : "Unlimited jobs on this plan"}
            </div>
          </div>

          <PortalSidebarNav
            showOnboardingHighlight={!onboardingComplete}
            showUpgradeHighlight={status === "trial" || plan === "starter"}
          />
        </aside>
        <section>{children}</section>
      </main>
    </>
  );
}
