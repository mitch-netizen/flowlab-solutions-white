import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getStripePriceId, stripeRequest } from "../../../../../../../lib/stripe";
import { getPlatformSession } from "../../../../../../../lib/session";

async function ensureStripeCustomer(input: {
  tenantId: string;
  slug: string;
  name: string;
  billingEmail: string;
  stripeCustomerId: string | null;
}) {
  if (input.stripeCustomerId) return input.stripeCustomerId;

  const body = new URLSearchParams();
  body.set("name", input.name);
  body.set("email", input.billingEmail);
  body.set("metadata[tenantId]", input.tenantId);
  body.set("metadata[tenantSlug]", input.slug);

  const customer = await stripeRequest<{ id?: string }>("/v1/customers", { body });
  if (!customer.id) throw new Error("Stripe customer was not created");

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { profile: true }
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const priceId = getStripePriceId(tenant.plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price for ${tenant.plan} is not configured. Set STRIPE_PRICE_${tenant.plan.toUpperCase()}.` },
      { status: 400 }
    );
  }

  if (tenant.stripeSubscriptionStatus === "active" || tenant.stripeSubscriptionStatus === "trialing") {
    return NextResponse.json({ error: "Tenant already has an active Stripe subscription" }, { status: 400 });
  }

  try {
    const customerId = await ensureStripeCustomer({
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.profile?.businessName ?? tenant.slug,
      billingEmail: tenant.billingEmail,
      stripeCustomerId: tenant.stripeCustomerId
    });

    const origin = new URL(request.url).origin;
    const body = new URLSearchParams();
    body.set("mode", "subscription");
    body.set("customer", customerId);
    body.set("client_reference_id", tenant.id);
    body.set("line_items[0][price]", priceId);
    body.set("line_items[0][quantity]", "1");
    body.set("allow_promotion_codes", "true");
    body.set("success_url", `${origin}/admin/tenant/${tenant.id}?tab=billing&stripe=checkout_success`);
    body.set("cancel_url", `${origin}/admin/tenant/${tenant.id}?tab=billing&stripe=checkout_cancelled`);
    body.set("metadata[tenantId]", tenant.id);
    body.set("metadata[tenantSlug]", tenant.slug);
    body.set("metadata[plan]", tenant.plan);
    body.set("subscription_data[metadata][tenantId]", tenant.id);
    body.set("subscription_data[metadata][tenantSlug]", tenant.slug);
    body.set("subscription_data[metadata][plan]", tenant.plan);

    if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()) {
      const trialDays = Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (trialDays > 0) body.set("subscription_data[trial_period_days]", String(trialDays));
    }

    const checkout = await stripeRequest<{ id?: string; url?: string }>("/v1/checkout/sessions", { body });
    if (!checkout.url) throw new Error("Stripe checkout session URL was not created");

    await prisma.platformEventLog.create({
      data: {
        tenantId: tenant.id,
        eventType: "info",
        service: "stripe",
        direction: "outbound",
        status: "success",
        requestSummary: "Stripe subscription checkout created by superadmin",
        responseSummary: checkout.id,
        triggeredBy: `superadmin_${session.email}`
      }
    });

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create Stripe checkout session" },
      { status: 500 }
    );
  }
}
