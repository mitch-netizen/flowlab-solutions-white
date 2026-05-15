import { prisma } from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";
import { CheckoutButton } from "./checkout-button";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "$79",
    period: "/ month",
    highlight: false,
    features: [
      "FlowLab subdomain for customer-facing pages",
      "Up to 50 jobs per month",
      "Up to 50 AI quotes per month",
      "SMS, email, and reminder automations",
      "Enquiry form, agreements, invoices, and payments",
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
      "Custom domain support",
      "Up to 200 jobs per month",
      "Up to 200 AI quotes per month",
      "Full automation suite with branded customer surfaces",
      "No FlowLab branding",
      "Optional Make.com blueprint pack for advanced automations"
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
    select: {
      plan: true,
      status: true,
      trialEndsAt: true,
      stripeSubscriptionStatus: true,
      profile: { select: { businessName: true } }
    }
  });

  const currentPlan = tenant?.plan ?? "starter";
  const status = tenant?.status ?? "trial";
  const trialEndsAt = tenant?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const hasActiveSubscription =
    tenant?.stripeSubscriptionStatus === "active" ||
    tenant?.stripeSubscriptionStatus === "trialing";

  return (
    <DashboardPageScaffold
      eyebrow="Setup"
      title="Choose the plan that matches the next stage of the business."
      description={
        status === "trial" && trialDaysLeft !== null && trialDaysLeft > 0
          ? `You have ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial. This page should make the differences between plans obvious at a glance.`
          : status === "trial" && (trialDaysLeft === null || trialDaysLeft <= 0)
            ? "Your trial has ended. Pick a plan below to restore full access."
            : `You are currently on ${currentPlan}. Upgrading should be straightforward, with your data, automations, and setup carrying over intact.`
      }
      section="setup"
    >
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
            <div className="text-3xl font-semibold">{currentPlan}</div>
            <p className="text-sm text-muted-foreground">The tenant stays on this plan until you switch.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Account status</div>
            <div className="text-3xl font-semibold">{status}</div>
            <p className="text-sm text-muted-foreground">{status === "trial" ? "Trial access is still active." : "Billing is active on the current plan."}</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Trial timing</div>
            <div className="text-3xl font-semibold">
              {trialDaysLeft === null ? "n/a" : trialDaysLeft <= 0 ? "Ended" : `${trialDaysLeft}d`}
            </div>
            <p className="text-sm text-muted-foreground">
              {trialDaysLeft === null ? "No trial end is currently set." : trialDaysLeft <= 0 ? "The free trial period has expired." : "Time remaining before a paid plan is needed."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Plans</div>
            <h2>Keep the comparison simple and legible</h2>
            <p>Plans should compare like product options, not like a stack of oversized pricing cards. Price, fit, and the important inclusions stay in one clean row each.</p>
          </div>
        </div>

        <div className="space-y-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key && status !== "trial";

            return (
              <div key={plan.key} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {plan.highlight ? <span className="status-pill is-on">Recommended</span> : null}
                    {isCurrent ? <span className="status-pill is-off">Current plan</span> : null}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3>{plan.name}</h3>
                    <div className="text-3xl font-semibold">
                      {plan.price}
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isCurrent ? (
                    <span className="text-sm text-muted-foreground">You&apos;re on this plan.</span>
                  ) : (
                    <CheckoutButton
                      plan={plan.key}
                      label={status === "trial" || currentPlan === "starter" ? `Get ${plan.name}` : `Switch to ${plan.name}`}
                      highlight={plan.highlight}
                      disabled={hasActiveSubscription && isCurrent}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Support</div>
          <h2 style={{ marginBottom: 8 }}>Questions before switching?</h2>
          <p>All plans include a 14-day free trial and the same core workflow you already tested. If you need help choosing, email <a href="mailto:hello@flowlabsolutions.au" className="inline-entity-link">hello@flowlabsolutions.au</a>.</p>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
