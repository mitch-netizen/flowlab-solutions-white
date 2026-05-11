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

export interface DraftMessageInput {
  businessName: string;
  businessType?: string;
  customerFirstName: string;
  customerLastName: string;
  customerSuburb?: string | null;
  customerNotes?: string | null;
  channel: "email" | "sms";
  intent?: string;
  job?: {
    summary: string;
    status: string;
    scheduledFor?: Date | null;
    address?: string | null;
    suburb?: string | null;
    actualHours?: number | null;
    estimatedHours?: number | null;
  } | null;
  invoice?: {
    number: string;
    amount: number;
    status: string;
    dueAt?: Date | null;
  } | null;
}

export interface DraftMessageResult {
  subject?: string;
  body: string;
}

export async function draftCommunicationMessage(input: DraftMessageInput): Promise<DraftMessageResult> {
  const isSms = input.channel === "sms";

  const contextLines: string[] = [
    `Business: ${input.businessName}${input.businessType ? ` (${input.businessType.replace(/_/g, " ")})` : ""}`,
    `Customer: ${input.customerFirstName} ${input.customerLastName}${input.customerSuburb ? `, ${input.customerSuburb}` : ""}`,
    input.customerNotes ? `Customer notes: ${input.customerNotes}` : ""
  ];

  if (input.job) {
    contextLines.push(`Job: ${input.job.summary} — status: ${input.job.status}`);
    if (input.job.scheduledFor) contextLines.push(`Scheduled: ${new Date(input.job.scheduledFor).toLocaleString("en-AU")}`);
    if (input.job.address) contextLines.push(`Address: ${input.job.address}${input.job.suburb ? `, ${input.job.suburb}` : ""}`);
    if (input.job.actualHours) contextLines.push(`Actual hours: ${input.job.actualHours}`);
  }

  if (input.invoice) {
    contextLines.push(`Invoice: ${input.invoice.number} — $${input.invoice.amount} — status: ${input.invoice.status}`);
    if (input.invoice.dueAt) contextLines.push(`Due: ${new Date(input.invoice.dueAt).toLocaleDateString("en-AU")}`);
  }

  if (input.intent) {
    contextLines.push(`Operator intent: ${input.intent}`);
  }

  const systemPrompt = isSms
    ? `You are a helpful assistant that writes short, friendly SMS messages on behalf of a trades business. Keep messages under 160 characters. Use plain conversational language. Sign off with the business name. Never use emoji unless the operator explicitly asks.`
    : `You are a helpful assistant that writes concise, professional email messages on behalf of a trades business. Keep emails short — 2–4 sentences. Start with a greeting using the customer's first name. Be warm and direct. Sign off with the business name.`;

  const userPrompt = [
    "Write a draft message for the following context:",
    ...contextLines.filter(Boolean),
    isSms
      ? "Format: SMS (under 160 characters, no subject line needed)"
      : "Format: Email — first line must be 'Subject: <subject text>' then a blank line then the email body"
  ].join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }]
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  if (isSms) {
    return { body: raw };
  }

  const subjectMatch = raw.match(/^Subject:\s*(.+)/im);
  const subject = subjectMatch?.[1]?.trim() ?? "";
  const emailBody = raw.replace(/^Subject:\s*.+\n?/im, "").trim();

  return { subject, body: emailBody };
}

export interface ServiceTemplateSuggestionInput {
  businessName: string;
  businessType: string;
  recentJobSummaries: string[];
  existingTemplateNames: string[];
}

export interface ServiceTemplateSuggestion {
  name: string;
  defaultPrice: number;
  defaultDuration: number;
  reason: string;
}

export interface MarketRateCheckInput {
  businessType: string;
  businessName: string;
  suburb?: string | null;
  proposedAmount: number;
  jobDescription: string;
}

export interface MarketRateCheckResult {
  verdict: "competitive" | "above_market" | "below_market" | "unclear";
  commentary: string;
}

export async function checkMarketRate(input: MarketRateCheckInput): Promise<MarketRateCheckResult> {
  const prompt = `You are a trades business advisor for Australia. A ${input.businessType.replace(/_/g, " ")} business called "${input.businessName}" wants to know if their proposed price is competitive.

Job description: "${input.jobDescription}"
Proposed amount: $${input.proposedAmount} AUD${input.suburb ? `\nLocation: ${input.suburb}` : ""}

Based on typical Australian market rates for this trade and job type, assess the proposed amount.

Return a JSON object only — no markdown:
{
  "verdict": "competitive" | "above_market" | "below_market" | "unclear",
  "commentary": "2-3 sentence assessment. Be specific about typical ranges if possible. Acknowledge when the job description is too vague to be certain."
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }]
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "{}";
  const jsonText = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(jsonText) as MarketRateCheckResult;
  } catch {
    return { verdict: "unclear", commentary: "Could not assess market rate for this job type. Try adding more detail to the job description." };
  }
}

export async function suggestServiceTemplates(input: ServiceTemplateSuggestionInput): Promise<ServiceTemplateSuggestion[]> {
  const prompt = `You are a business assistant helping "${input.businessName}", a ${input.businessType.replace(/_/g, " ")} business, set up service templates for quoting.

Recent jobs completed:
${input.recentJobSummaries.length > 0 ? input.recentJobSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n") : "No jobs recorded yet."}

Existing service templates (do not duplicate these):
${input.existingTemplateNames.length > 0 ? input.existingTemplateNames.map((n) => `- ${n}`).join("\n") : "None yet."}

Suggest 3–5 service templates that are not already covered. Base pricing on typical Australian trade rates for a ${input.businessType.replace(/_/g, " ")} business.

Return a JSON array only — no markdown fences, no explanation:
[
  { "name": "Service name", "defaultPrice": 120, "defaultDuration": 60, "reason": "One sentence on why this is a good template to have." },
  ...
]`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }]
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";
  const jsonText = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(jsonText) as ServiceTemplateSuggestion[];
  } catch {
    return [];
  }
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
  } else if (input.pricingModel === "hourly" || input.pricingModel === "callout_plus_hourly") {
    const rateContext = input.pricingRate?.hourlyRate
      ? `${input.pricingModel === "callout_plus_hourly" ? `Call-out fee: $${input.pricingRate.calloutFee ?? 0}\n` : ""}Hourly rate: $${input.pricingRate.hourlyRate}/hr
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
