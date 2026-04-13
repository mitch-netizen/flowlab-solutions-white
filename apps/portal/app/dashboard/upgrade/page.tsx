import { prisma } from "@flowlab/db";
import { getPlanFeatures } from "@flowlab/contracts";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "$79",
    period: "/ month",
    highlight: false,
    features: [
      "FlowLab subdomain (yourbusiness.flowlabsolutions.au)",
      "Up to 50 jobs per month",
      "Up to 50 AI quotes per month",
      "Full automation suite (SMS, email, reminders)",
      "Enquiry form, agreements, invoices, payments",
      "FlowLab branding on customer-facing pages"
    ]
  },
  {
    key: "professional" as const,
    name: "Professional",
    price: "$149",
    period: "/ month",
    highlight: true,
    features: [
      "Custom domain (yourbusiness.com.au)",
      "Up to 200 jobs per month",
      "Up to 200 AI quotes per month",
      "Full automation suite (SMS, email, reminders)",
      "No FlowLab branding — 100% your brand",
      "Make.com blueprint pack (16 automation templates)"
    ]
  },
  {
    key: "growth" as const,
    name: "Growth",
    price: "$249",
    period: "/ month",
    highlight: false,
    features: [
      "Custom domain",
      "Unlimited jobs and AI quotes",
      "Multi-user team access",
      "API access for custom integrations",
      "Priority support",
      "No FlowLab branding"
    ]
  }
];

export default async function UpgradePage() {
  const session = await requireTenantSession();
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { plan: true, status: true, trialEndsAt: true, profile: { select: { businessName: true } } }
  });

  const currentPlan = tenant?.plan ?? "starter";
  const status = tenant?.status ?? "trial";
  const trialEndsAt = tenant?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Choose the plan that fits the next stage of the business."
        description={
          status === "trial" && trialDaysLeft !== null && trialDaysLeft > 0
            ? `You have ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial. All plans include everything you tested during the trial.`
            : status === "trial" && (trialDaysLeft === null || trialDaysLeft <= 0)
              ? "Your trial has ended. Pick a plan below to restore full access."
              : `You're currently on ${currentPlan}. Upgrade at any time and your data, automations, and setup carry over.`
        }
        section="setup"
      />

      <div className="cards-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key && status !== "trial";
          return (
            <div
              key={plan.key}
              className="surface"
              style={{
                outline: plan.highlight ? "2px solid #3b82f6" : undefined,
                position: "relative"
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#3b82f6", color: "#fff",
                  fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999,
                  whiteSpace: "nowrap"
                }}>
                  Most popular
                </div>
              )}
              {isCurrent && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ background: "#14532d", color: "#86efac", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                    Current plan
                  </span>
                </div>
              )}
              <div className="eyebrow">{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, margin: "8px 0 4px" }}>
                {plan.price}
                <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, color: "#cbd5e1", fontSize: 14 }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>You&apos;re on this plan</div>
              ) : (
                <a
                  href={`mailto:hello@flowlabsolutions.au?subject=Upgrade to ${plan.name}&body=Hi, I'd like to upgrade ${tenant?.profile?.businessName ?? "my account"} to the ${plan.name} plan.`}
                  className="cta"
                  style={{ display: "block", textAlign: "center", ...(plan.highlight ? {} : { background: "transparent", border: "1px solid #334155", color: "#e2e8f0" }) }}
                >
                  {status === "trial" || currentPlan === "starter" ? `Get ${plan.name}` : `Switch to ${plan.name}`}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="surface-soft" style={{ textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        <p style={{ margin: "0 0 8px" }}>
          All plans include a 14-day free trial. No credit card required to start.
        </p>
        <p style={{ margin: 0 }}>
          Questions? Email <a href="mailto:hello@flowlabsolutions.au" style={{ color: "#3b82f6" }}>hello@flowlabsolutions.au</a>
        </p>
      </div>
    </div>
  );
}
