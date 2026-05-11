import { redirect } from "next/navigation";

import Anthropic from "@anthropic-ai/sdk";
import { prisma, saveRateSuggestions } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST() {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const [history, pricingRate, profile] = await Promise.all([
    prisma.timeEstimateHistory.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.pricingRate.findFirst({ where: { tenantId } }),
    prisma.tenantProfile.findFirst({
      where: { tenantId },
      select: { businessName: true }
    })
  ]);

  if (history.length < 5 || !pricingRate) {
    redirect("/dashboard/settings?rates=insufficient");
  }

  const avgVariance = history.reduce((sum, item) => sum + item.variancePct, 0) / history.length;
  const overEstimated = history.filter((item) => item.variancePct < -15).length;
  const underEstimated = history.filter((item) => item.variancePct > 15).length;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a field service business advisor for "${profile?.businessName ?? "a business"}".

Analyse this job duration data and suggest pricing rate adjustments if needed:
- Total jobs analysed: ${history.length}
- Average variance: ${avgVariance.toFixed(1)}% (positive = ran over estimate, negative = ran under)
- Jobs that significantly over-ran (>15% variance): ${underEstimated}
- Jobs that significantly under-ran (<-15% variance): ${overEstimated}

Current rates:
- Standard: $${pricingRate.baseRatePerSquareM}/m²
- Overgrown: $${pricingRate.overgrownRate}/m²
- Heavily overgrown: $${pricingRate.heavilyOvergrownRate}/m²
- Minimum charge: $${pricingRate.minimumCharge}

Return a JSON array of suggested rate adjustments (only include rates that should change):
[
  {
    "field": "baseRatePerSquareM" | "overgrownRate" | "heavilyOvergrownRate" | "minimumCharge",
    "label": "human readable label",
    "current": number,
    "suggested": number,
    "reason": "brief explanation"
  }
]

Return an empty array [] if no changes are recommended. Return ONLY JSON, no markdown.`
      }
    ]
  });

  const rawText = response.content.find((block) => block.type === "text")?.text ?? "[]";
  const jsonText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  let suggestions: Array<{ field: string; label: string; current: number; suggested: number; reason: string }> = [];
  try {
    suggestions = JSON.parse(jsonText) as typeof suggestions;
  } catch {
    suggestions = [];
  }

  if (suggestions.length > 0) {
    await saveRateSuggestions(tenantId, suggestions);
  }

  redirect("/dashboard/settings?rates=analysed");
}
