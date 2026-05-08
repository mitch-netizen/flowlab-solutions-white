import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import {
  getPlanFromStripePrice,
  getTenantStatusFromStripeSubscription,
  retrieveStripeSubscription,
  verifyStripeWebhookSignature,
  type StripeSubscriptionSnapshot
} from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getUnixDate(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000) : undefined;
}

async function logStripeEvent(input: {
  tenantId?: string | null;
  eventId: string;
  eventType: string;
  status: "success" | "failed" | "pending";
  summary: string;
  errorMessage?: string;
}) {
  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: input.status === "failed" ? "error" : "webhook_received",
      service: "stripe",
      direction: "inbound",
      status: input.status,
      requestSummary: input.summary,
      responseSummary: input.eventType,
      errorMessage: input.errorMessage,
      triggeredBy: `stripe_${input.eventId}`
    }
  });
}

async function syncTenantSubscription(subscription: StripeSubscriptionSnapshot, eventId: string, eventType: string) {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const plan = getPlanFromStripePrice(priceId);
  const tenantId = subscription.metadata?.tenantId;
  const orConditions = [
    tenantId ? { id: tenantId } : null,
    { stripeSubscriptionId: subscription.id },
    { stripeCustomerId: subscription.customer }
  ].filter(Boolean) as Array<{ id: string } | { stripeSubscriptionId: string } | { stripeCustomerId: string }>;

  const tenant = await prisma.tenant.findFirst({
    where: { OR: orConditions }
  });

  if (!tenant) {
    await logStripeEvent({
      eventId,
      eventType,
      status: "failed",
      summary: `Stripe subscription ${subscription.id} could not be matched to a tenant`,
      errorMessage: "No tenant matched subscription metadata, subscription ID, or customer ID"
    });
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      status: getTenantStatusFromStripeSubscription(subscription.status),
      ...(plan ? { plan } : {}),
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId,
      subscriptionStartDate: getUnixDate(subscription.current_period_start) ?? tenant.subscriptionStartDate
    }
  });

  await logStripeEvent({
    tenantId: tenant.id,
    eventId,
    eventType,
    status: "success",
    summary: `Tenant subscription synced from Stripe: ${subscription.status}`
  });
}

async function handleCheckoutCompleted(event: StripeWebhookEvent) {
  const session = event.data.object;
  const tenantId = getString(session.client_reference_id) ?? getString((session.metadata as Record<string, unknown> | undefined)?.tenantId);
  const customerId = getString(session.customer);
  const subscriptionId = getString(session.subscription);

  if (!tenantId || !subscriptionId || !customerId) {
    await logStripeEvent({
      eventId: event.id,
      eventType: event.type,
      status: "failed",
      summary: "Stripe checkout completed without tenant, customer, or subscription ID",
      errorMessage: JSON.stringify({ tenantId, customerId, subscriptionId })
    });
    return;
  }

  const subscription = await retrieveStripeSubscription(subscriptionId);
  await syncTenantSubscription(subscription, event.id, event.type);
}

async function handleSubscriptionEvent(event: StripeWebhookEvent) {
  await syncTenantSubscription(event.data.object as StripeSubscriptionSnapshot, event.id, event.type);
}

async function handleInvoiceEvent(event: StripeWebhookEvent) {
  const invoice = event.data.object;
  const subscriptionId = getString(invoice.subscription);
  const customerId = getString(invoice.customer);
  const orConditions = [
    subscriptionId ? { stripeSubscriptionId: subscriptionId } : null,
    customerId ? { stripeCustomerId: customerId } : null
  ].filter(Boolean) as Array<{ stripeSubscriptionId: string } | { stripeCustomerId: string }>;

  if (orConditions.length === 0) {
    await logStripeEvent({
      eventId: event.id,
      eventType: event.type,
      status: "failed",
      summary: "Stripe invoice webhook did not include a subscription or customer ID"
    });
    return;
  }

  const tenant = await prisma.tenant.findFirst({
    where: { OR: orConditions }
  });

  if (!tenant) {
    await logStripeEvent({
      eventId: event.id,
      eventType: event.type,
      status: "failed",
      summary: "Stripe invoice webhook could not be matched to a tenant"
    });
    return;
  }

  const failed = event.type === "invoice.payment_failed";
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: failed ? { status: "suspended" } : { status: "active" }
  });

  await logStripeEvent({
    tenantId: tenant.id,
    eventId: event.id,
    eventType: event.type,
    status: failed ? "failed" : "success",
    summary: failed ? "FlowLab subscription payment failed" : "FlowLab subscription payment succeeded"
  });
}

export async function POST(request: Request) {
  const payload = await request.text();

  try {
    if (!verifyStripeWebhookSignature(payload, request.headers.get("stripe-signature"))) {
      return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook verification failed" },
      { status: 400 }
    );
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event);
        break;
      default:
        break;
    }
  } catch (error) {
    await logStripeEvent({
      eventId: event.id,
      eventType: event.type,
      status: "failed",
      summary: "Stripe webhook processing failed",
      errorMessage: error instanceof Error ? error.message : "Unknown webhook error"
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
