import crypto from "node:crypto";

import type { TenantPlan } from "@flowlab/contracts";

export const STRIPE_API_VERSION = "2026-02-25.clover";

export type StripeSubscriptionSnapshot = {
  id: string;
  customer: string;
  status: string;
  current_period_start?: number;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
};

type StripeErrorResponse = {
  error?: {
    message?: string;
  };
};

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY;
}

export function getStripePriceId(plan: TenantPlan | string) {
  const envKey = `STRIPE_PRICE_${plan.toString().toUpperCase()}`;
  return process.env[envKey] ?? process.env[`${envKey}_ID`];
}

export function getPlanFromStripePrice(priceId?: string | null): TenantPlan | null {
  if (!priceId) return null;

  const matches: Array<[TenantPlan, string | undefined]> = [
    ["starter", getStripePriceId("starter")],
    ["professional", getStripePriceId("professional")],
    ["growth", getStripePriceId("growth")]
  ];

  return matches.find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] ?? null;
}

export function getTenantStatusFromStripeSubscription(status?: string | null) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled") return "cancelled";
  if (status === "past_due" || status === "unpaid" || status === "paused") return "suspended";
  return "trial";
}

export async function stripeRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
  } = {}
) {
  const secretKey = getStripeSecretKey();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION
    },
    body: options.method === "GET" ? undefined : options.body
  });

  const data = (await response.json()) as T & StripeErrorResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe request failed");
  }

  return data as T;
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscriptionSnapshot>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "GET"
  });
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  if (!signatureHeader) return false;

  const signatures: string[] = [];
  let timestamp: string | null = null;

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value ?? null;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, "hex");
      return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  });
}
