import type { TenantPlan } from "@flowlab/contracts";

export function getStripePriceId(plan: TenantPlan | string): string | undefined {
  const envKey = `STRIPE_PRICE_${plan.toString().toUpperCase()}`;
  return (process.env[envKey] ?? process.env[`${envKey}_ID`])?.trim();
}

export async function stripeRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: URLSearchParams } = {}
): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2026-02-25.clover"
    },
    body: options.method === "GET" ? undefined : options.body
  });

  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error((data as { error?: { message?: string } }).error?.message ?? "Stripe request failed");

  return data;
}
