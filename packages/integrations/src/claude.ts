import Anthropic from "@anthropic-ai/sdk";

import type { PricingModel } from "@flowlab/contracts";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface AIQuoteInput {
  tenantId: string;
  businessName: string;
  businessType: string;
  pricingModel: PricingModel;
  enquiryText: string;
  // area_based inputs
  areaM2?: number;
  siteCondition?: "standard" | "overgrown" | "heavily_overgrown";
  // hourly inputs
  estimatedHours?: number;
  // shared pricing data
  services?: Array<{ name: string; defaultPrice: number; defaultDuration: number }>;
  pricingRate?: {
    baseRatePerSquareM?: number | null;
    overgrownRate?: number | null;
    heavilyOvergrownRate?: number | null;
    hourlyRate?: number | null;
    calloutFee?: number | null;
    minimumCharge?: number | null;
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
  const minimum = input.pricingRate?.minimumCharge ?? 55;
  const gst = input.pricingRate?.gstEnabled ? "included (10%)" : "not applicable";

  const serviceContext =
    input.services && input.services.length > 0
      ? `Available services:\n${input.services.map((s) => `- ${s.name}: $${s.defaultPrice} (est. ${s.defaultDuration} min)`).join("\n")}`
      : "No predefined services — quote based on the enquiry description.";

  let modelContext: string;

  if (input.pricingModel === "area_based") {
    const conditionLabel =
      input.siteCondition === "heavily_overgrown"
        ? "heavily overgrown"
        : input.siteCondition === "overgrown"
          ? "overgrown"
          : "standard / well-maintained";

    const rateContext = input.pricingRate?.baseRatePerSquareM
      ? `Pricing rates:
- Standard: $${input.pricingRate.baseRatePerSquareM}/m²
- Overgrown: $${input.pricingRate.overgrownRate ?? "n/a"}/m²
- Heavily overgrown: $${input.pricingRate.heavilyOvergrownRate ?? "n/a"}/m²
- Minimum charge: $${minimum}
- GST: ${gst}`
      : "No specific pricing rates configured — use your best judgement for the local market.";

    modelContext = `${input.areaM2 ? `Estimated property area: ${input.areaM2}m²` : "Property area not specified."}
Site condition: ${conditionLabel}

${rateContext}`;
  } else if (input.pricingModel === "hourly") {
    const rateContext = input.pricingRate?.hourlyRate
      ? `Hourly rate: $${input.pricingRate.hourlyRate}/hr
Minimum charge: $${minimum}
GST: ${gst}`
      : "No hourly rate configured — use your best judgement for the local market.";

    modelContext = `${input.estimatedHours ? `Estimated hours: ${input.estimatedHours}` : "Hours not specified — estimate from the job description."}

${rateContext}`;
  } else {
    // flat_rate
    const rateContext = input.pricingRate?.calloutFee
      ? `Call-out fee: $${input.pricingRate.calloutFee}
Minimum charge: $${minimum}
GST: ${gst}`
      : "No call-out fee configured — use your best judgement for the local market.";

    modelContext = rateContext;
  }

  const prompt = `You are a quoting assistant for "${input.businessName}", a ${input.businessType.replace(/_/g, " ")} business.

A customer has submitted the following enquiry:
"${input.enquiryText}"

${modelContext}

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
- recommendedPrice must be >= minimum charge (${minimum})
- breakdown items must sum to recommendedPrice
- confidence is "high" when job scope is clear, "medium" when one factor is estimated, "low" when scope is vague
- Return ONLY the JSON — no markdown fences, no explanation`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }]
  });

  const durationMs = Date.now() - start;
  const rawText = response.content.find((b) => b.type === "text")?.text ?? "";
  const jsonText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  let parsed: Omit<AIQuoteResult, "durationMs">;
  try {
    parsed = JSON.parse(jsonText) as Omit<AIQuoteResult, "durationMs">;
  } catch {
    const priceMatch = rawText.match(/\$?(\d+(?:\.\d+)?)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : minimum;
    parsed = {
      title: input.enquiryText.split(".")[0]?.slice(0, 60) || "Service quote",
      estimatedHours: 1,
      recommendedPrice: Math.round(price),
      breakdown: [{ item: "Service", price: Math.round(price) }],
      notes: "AI parse error — please review and adjust this quote manually.",
      confidence: "low"
    };
  }

  if (parsed.recommendedPrice < minimum) {
    parsed.recommendedPrice = minimum;
    if (parsed.breakdown.length === 1) {
      parsed.breakdown[0].price = minimum;
    }
  }

  return { ...parsed, durationMs };
}
