import { z } from "zod";

import { businessTypeSchema, tenantPlanSchema, tenantStatusSchema } from "./index";

export const CANONICAL_ROOT_DOMAIN = "flowlabsolutions.au";
export const LEGACY_ROOT_DOMAINS = ["flowlabsolutions.com.au"] as const;

function cleanDomain(input: string | undefined | null) {
  return (input ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function isProductionRuntime() {
  // NEXT_PHASE is set to "phase-production-build" during `next build`.
  // We only want to enforce env-var checks at actual runtime, not during SSG/prerender.
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

export function getCanonicalRootDomain() {
  return cleanDomain(process.env.DEFAULT_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN) || CANONICAL_ROOT_DOMAIN;
}

export function getLegacyRootDomains() {
  return LEGACY_ROOT_DOMAINS.filter((domain) => domain !== getCanonicalRootDomain());
}

export function getPlatformBaseUrl() {
  return `https://${getCanonicalRootDomain()}`;
}

export function buildTenantUrl(slug: string, path = "") {
  const normalisedPath = path.startsWith("/") || path === "" ? path : `/${path}`;
  return `https://${slug}.${getCanonicalRootDomain()}${normalisedPath}`;
}

export function getExpectedTenantCname(slug: string) {
  return `${slug}.${getCanonicalRootDomain()}`;
}

export function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const appEnvRequirements = {
  web: ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "ENCRYPTION_MASTER_KEY", "DEFAULT_ROOT_DOMAIN"],
  portal: ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "ENCRYPTION_MASTER_KEY", "DEFAULT_ROOT_DOMAIN", "CRON_SECRET"],
  worker: ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "ENCRYPTION_MASTER_KEY", "DEFAULT_ROOT_DOMAIN", "CRON_SECRET"]
} as const;

export const appOptionalEnvRequirements = {
  web: ["SENTRY_DSN"],
  portal: ["SENTRY_DSN"],
  worker: ["SENTRY_DSN"]
} as const;

export function ensureAppEnv(app: keyof typeof appEnvRequirements) {
  if (!isProductionRuntime()) {
    return;
  }

  for (const name of appEnvRequirements[app]) {
    requireServerEnv(name);
  }
}

export function getClientIpFromRequest(request: Request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function validateBotGuard(input: { website?: string | null; formStartedAt?: string | number | null }, minimumAgeMs = 1200) {
  const website = String(input.website ?? "").trim();

  if (website) {
    throw new Error("Bot submission blocked");
  }

  const started = Number(input.formStartedAt ?? 0);
  if (!Number.isFinite(started) || started <= 0) {
    throw new Error("Missing form guard");
  }

  if (Date.now() - started < minimumAgeMs) {
    throw new Error("Form submitted too quickly");
  }
}

export const signupInputSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(128),
  phone: z.string().trim().max(40).optional().default(""),
  suburb: z.string().trim().max(120).optional().default(""),
  businessType: businessTypeSchema,
  plan: tenantPlanSchema,
  website: z.string().trim().max(0).optional().default(""),
  formStartedAt: z.coerce.number().int().positive()
});

export const authLoginInputSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(128)
});

export const publicEnquiryInputSchema = z.object({
  tenantId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  suburb: z.string().trim().max(120).optional().default(""),
  serviceRequest: z.string().trim().min(8).max(2000),
  website: z.string().trim().max(0).optional().default(""),
  formStartedAt: z.coerce.number().int().positive()
});

export const feedbackSubmissionSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default("")
});

export const adminImpersonateSchema = z.object({
  tenantId: z.string().uuid()
});

export const adminTenantCreateSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(128),
  phone: z.string().trim().max(40).optional().default(""),
  suburb: z.string().trim().max(120).optional().default(""),
  businessType: businessTypeSchema,
  plan: tenantPlanSchema
});

export const adminTenantUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  plan: tenantPlanSchema.optional(),
  status: tenantStatusSchema.optional(),
  monthlyFee: z.coerce.number().min(0).max(100000).optional(),
  billingEmail: z.string().trim().email().max(200).optional(),
  stripeCustomerId: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(4000).optional()
});

export const onboardingStepSchema = z.object({
  step: z.coerce.number().int().min(1).max(6),
  completed: z.coerce.boolean().optional()
});

export const publicRouteTokenSchema = z.object({
  token: z.string().min(1).max(512)
});
