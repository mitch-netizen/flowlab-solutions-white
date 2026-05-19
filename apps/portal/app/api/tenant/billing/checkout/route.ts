import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { requireTenantSession } from "../../../../../lib/session";
import { getStripePriceId, stripeRequest } from "../../../../../lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();

    const body = (await request.json().catch(() => null)) as { plan?: string } | null;
    const plan = body?.plan?.trim();
    if (!plan || !["starter", "professional", "growth"].includes(plan)) {
      return NextResponse.json({ error: "Valid plan required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { profile: true }
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    if (tenant.stripeSubscriptionStatus === "active" || tenant.stripeSubscriptionStatus === "trialing") {
      return NextResponse.json({ error: "Already has an active subscription" }, { status: 400 });
    }

    const priceId = getStripePriceId(plan);
    if (!priceId || !priceId.startsWith("price_")) {
      return NextResponse.json(
        { error: `Stripe price for ${plan} is not configured. Contact support.` },
        { status: 400 }
      );
    }

    // Ensure Stripe customer exists
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customerBody = new URLSearchParams();
      customerBody.set("name", tenant.profile?.businessName ?? tenant.slug);
      customerBody.set("email", tenant.billingEmail);
      customerBody.set("metadata[tenantId]", tenant.id);
      customerBody.set("metadata[tenantSlug]", tenant.slug);

      const customer = await stripeRequest<{ id?: string }>("/v1/customers", { body: customerBody });
      if (!customer.id) return NextResponse.json({ error: "Could not create billing account" }, { status: 500 });

      customerId = customer.id;
      await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } });
    }

    const host = new URL(request.url).origin;
    const checkoutBody = new URLSearchParams();
    checkoutBody.set("mode", "subscription");
    checkoutBody.set("customer", customerId);
    checkoutBody.set("client_reference_id", tenant.id);
    checkoutBody.set("line_items[0][price]", priceId);
    checkoutBody.set("line_items[0][quantity]", "1");
    checkoutBody.set("allow_promotion_codes", "true");
    checkoutBody.set("success_url", `${host}/dashboard/upgrade?checkout=success`);
    checkoutBody.set("cancel_url", `${host}/dashboard/upgrade`);
    checkoutBody.set("metadata[tenantId]", tenant.id);
    checkoutBody.set("metadata[tenantSlug]", tenant.slug);
    checkoutBody.set("metadata[plan]", plan);
    checkoutBody.set("subscription_data[metadata][tenantId]", tenant.id);
    checkoutBody.set("subscription_data[metadata][tenantSlug]", tenant.slug);
    checkoutBody.set("subscription_data[metadata][plan]", plan);

    // Carry over any remaining trial days
    if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()) {
      const trialDays = Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (trialDays > 0) checkoutBody.set("subscription_data[trial_period_days]", String(trialDays));
    }

    const checkout = await stripeRequest<{ url?: string }>("/v1/checkout/sessions", { body: checkoutBody });
    if (!checkout.url) return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });

    await prisma.platformEventLog.create({
      data: {
        tenantId: tenant.id,
        eventType: "info",
        service: "stripe",
        direction: "outbound",
        status: "success",
        requestSummary: `Tenant-initiated Stripe checkout for ${plan} plan`,
        triggeredBy: `tenant_${session.email}`
      }
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Database connection pool exhausted — transient, safe to surface
    if (message.includes("max clients") || message.includes("EMAXCONN") || message.includes("pool")) {
      return NextResponse.json(
        { error: "Service is temporarily busy. Please try again in a moment." },
        { status: 503 }
      );
    }

    // Stripe errors carry a human-readable message — pass them through
    if (message && !message.includes("prisma") && !message.toLowerCase().includes("internal")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
