import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { logWebhookFailure, markInvoicePaidByStripeSession } from "@flowlab/db";
import { getStripeClient } from "@flowlab/integrations";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (webhookSecret && stripeSecret) {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      await logWebhookFailure({ service: "stripe", errorMessage: "Missing stripe-signature header", requestSummary: "Stripe webhook rejected — no signature" });
      return NextResponse.json({ ok: false, error: "Missing Stripe signature" }, { status: 400 });
    }

    let event;
    try {
      const payload = await request.text();
      const stripe = getStripeClient(stripeSecret);
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logWebhookFailure({ service: "stripe", errorMessage: msg, requestSummary: "Stripe webhook signature verification failed" });
      return NextResponse.json({ ok: false, error: "Invalid Stripe signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      try {
        await markInvoicePaidByStripeSession(session.id);
        await processAutomationBatch(5);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logWebhookFailure({ service: "stripe", errorMessage: msg, requestSummary: `Failed to mark invoice paid for Stripe session ${session.id}` });
        // Return 200 so Stripe stops retrying a permanently unresolvable event
        console.error("[stripe-webhook] processing error:", msg, { sessionId: session.id, eventType: event.type });
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Dev/test path — no webhook secret configured
  if (process.env.ALLOW_FAKE_PAYMENTS !== "true") {
    return NextResponse.json({ ok: false, error: "Stripe webhook secret is required in this environment" }, { status: 400 });
  }

  let sessionId: string | undefined;
  try {
    const body = await request.json();
    sessionId = body?.data?.object?.id ?? body?.session_id;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing Stripe session id" }, { status: 400 });
  }

  await markInvoicePaidByStripeSession(String(sessionId));
  await processAutomationBatch(5);
  return NextResponse.json({ ok: true });
}
