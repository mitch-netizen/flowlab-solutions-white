import { NextResponse } from "next/server";

import { markInvoicePaidByStripeSession } from "@flowlab/db";
import { getStripeClient } from "@flowlab/integrations";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (webhookSecret && stripeSecret) {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ ok: false, error: "Missing Stripe signature" }, { status: 400 });
    }

    const payload = await request.text();
    const stripe = getStripeClient(stripeSecret);
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      await markInvoicePaidByStripeSession(session.id);
    }

    return NextResponse.json({ ok: true });
  }

  const body = await request.json();
  const sessionId = body?.data?.object?.id ?? body?.session_id;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing Stripe session id" }, { status: 400 });
  }

  if (process.env.ALLOW_FAKE_PAYMENTS !== "true") {
    return NextResponse.json({ ok: false, error: "Stripe webhook secret is required in this environment" }, { status: 400 });
  }

  await markInvoicePaidByStripeSession(String(sessionId));
  return NextResponse.json({ ok: true });
}
