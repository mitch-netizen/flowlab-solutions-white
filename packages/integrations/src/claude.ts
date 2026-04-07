import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface AIQuoteInput {
  tenantId: string;
  businessName: string;
  businessType: string;
  enquiryText: string;
  areaM2?: number;
  siteCondition?: "standard" | "overgrown" | "heavily_overgrown";
  services?: Array<{ name: string; defaultPrice: number; defaultDuration: number }>;
  pricingRate?: {
    baseRatePerSquareM: number;
    overgrownRate: number;
    heavilyOvergrownRate: number;
    minimumCharge: number;
    gstEnabled: boolean;
  } | null;
  satelliteImageUrl?: string | null;
}

export interface AIQuoteResult {
  title: string;
  estimatedHours: number;
  recommendedPrice: number;
  breakdown: Array<{ item: string; price: number }>;
  notes: string;
  confidence: "high" | "medium" | "low";
  durationMs: number;
}

export async function generateAIQuote(input: AIQuoteInput): Promise<AIQuoteResult> {
  const start = Date.now();

  const conditionLabel =
    input.siteCondition === "heavily_overgrown"
      ? "heavily overgrown"
      : input.siteCondition === "overgrown"
        ? "overgrown"
        : "standard / well-maintained";

  const rateContext = input.pricingRate
    ? `Pricing rates:
- Standard: $${input.pricingRate.baseRatePerSquareM}/m²
- Overgrown: $${input.pricingRate.overgrownRate}/m²
- Heavily overgrown: $${input.pricingRate.heavilyOvergrownRate}/m²
- Minimum charge: $${input.pricingRate.minimumCharge}
- GST: ${input.pricingRate.gstEnabled ? "included (10%)" : "not applicable"}`
    : "No specific pricing rates configured — use your best judgement for the local market.";

  const serviceContext =
    input.services && input.services.length > 0
      ? `Available services:\n${input.services.map((s) => `- ${s.name}: $${s.defaultPrice} (est. ${s.defaultDuration} min)`).join("\n")}`
      : "No predefined services — quote based on the enquiry description.";

  const areaContext = input.areaM2 ? `Estimated property area: ${input.areaM2}m²` : "Property area not specified.";

  const prompt = `You are a quoting assistant for "${input.businessName}", a ${input.businessType.replace(/_/g, " ")} business.

A customer has submitted the following enquiry:
"${input.enquiryText}"

${areaContext}
Site condition: ${conditionLabel}

${rateContext}

${serviceContext}

Generate a professional quote for this job. Return a JSON object with exactly these fields:
{
  "title": "short job title (max 60 chars)",
  "estimatedHours": number (e.g. 2.5),
  "recommendedPrice": number (whole dollars, no cents),
  "breakdown": [
    { "item": "service description", "price": number },
    ...
  ],
  "notes": "brief note for the operator about assumptions or things to verify",
  "confidence": "high" | "medium" | "low"
}

Rules:
- recommendedPrice must be >= minimum charge (${input.pricingRate?.minimumCharge ?? 55})
- breakdown items must sum to recommendedPrice
- confidence is "high" when area and condition are known, "medium" when one is estimated, "low" when both are unknown
- Return ONLY the JSON — no markdown fences, no explanation`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages
  });

  const durationMs = Date.now() - start;
  const rawText = response.content.find((b) => b.type === "text")?.text ?? "";

  // Parse JSON response — strip any accidental markdown fences
  const jsonText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  let parsed: Omit<AIQuoteResult, "durationMs">;
  try {
    parsed = JSON.parse(jsonText) as Omit<AIQuoteResult, "durationMs">;
  } catch {
    // Fallback: extract numbers and build a minimal result
    const priceMatch = rawText.match(/\$?(\d+(?:\.\d+)?)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : input.pricingRate?.minimumCharge ?? 55;
    parsed = {
      title: input.enquiryText.split(".")[0]?.slice(0, 60) || "Service quote",
      estimatedHours: 1,
      recommendedPrice: Math.round(price),
      breakdown: [{ item: "Service", price: Math.round(price) }],
      notes: "AI parse error — please review and adjust this quote manually.",
      confidence: "low"
    };
  }

  // Enforce minimum charge
  const minimum = input.pricingRate?.minimumCharge ?? 55;
  if (parsed.recommendedPrice < minimum) {
    parsed.recommendedPrice = minimum;
    if (parsed.breakdown.length === 1) {
      parsed.breakdown[0].price = minimum;
    }
  }

  return { ...parsed, durationMs };
}
