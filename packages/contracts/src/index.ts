import { z } from "zod";

export const tenantPlanSchema = z.enum(["starter", "professional", "growth"]);
export type TenantPlan = z.infer<typeof tenantPlanSchema>;

export const tenantStatusSchema = z.enum(["trial", "active", "suspended", "cancelled"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const businessTypeSchema = z.enum([
  "lawn_mowing",
  "cleaning",
  "pest_control",
  "gardening",
  "handyman",
  "pool_service",
  "other"
]);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export type PricingModel = "area_based" | "hourly" | "flat_rate";

/**
 * Returns the appropriate pricing model for a given business type.
 * - area_based: prices by m² (lawn mowing, gardening)
 * - hourly: prices by hours worked (cleaning, handyman, pool service)
 * - flat_rate: fixed callout/service prices (pest control, other)
 */
export function getPricingModel(businessType: BusinessType | string | null | undefined): PricingModel {
  switch (businessType) {
    case "lawn_mowing":
    case "gardening":
      return "area_based";
    case "cleaning":
    case "handyman":
    case "pool_service":
      return "hourly";
    case "pest_control":
    case "other":
    default:
      return "flat_rate";
  }
}

export const integrationServiceSchema = z.enum([
  "twilio",
  "sendgrid",
  "stripe",
  "docuseal",
  "google_maps",
  "xero",
  "make_com",
  "claude"
]);
export type IntegrationService = z.infer<typeof integrationServiceSchema>;

// Legacy persisted identifiers kept for DB compatibility until we run a real enum/data migration.
export const BREVO_SMS_INTEGRATION_SERVICE: IntegrationService = "twilio";
export const BREVO_EMAIL_INTEGRATION_SERVICE: IntegrationService = "sendgrid";

export const integrationStatusSchema = z.enum([
  "not_configured",
  "connected",
  "error",
  "disconnected"
]);
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;

export const platformEventStatusSchema = z.enum(["success", "failed", "pending", "timeout"]);
export type PlatformEventStatus = z.infer<typeof platformEventStatusSchema>;

export const platformEventTypeSchema = z.enum(["api_call", "webhook_fired", "webhook_received", "error", "warning", "info"]);
export type PlatformEventType = z.infer<typeof platformEventTypeSchema>;

export type RoleScope = "platform" | "tenant" | "customer";

export interface TenantProfile {
  tenantId: string;
  slug: string;
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColour: string;
  secondaryColour: string;
  accentColour: string;
  fontPreference: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  abn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  serviceAreaSuburbs: string[];
  businessType: BusinessType;
  timezone: string;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  host: string;
  customDomain: string | null;
  isCustomDomain: boolean;
  plan: TenantPlan;
  status: TenantStatus;
  branding: TenantProfile;
}

export interface TenantIntegration {
  id: string;
  tenantId: string;
  service: IntegrationService;
  status: IntegrationStatus;
  lastTestedAt: string | null;
  lastTestResult: "success" | "failed" | null;
  lastErrorMessage: string | null;
  webhookUrl: string | null;
  oauthExpiresAt?: string | null;
  usageThisMonth?: number;
}

export interface PlatformEventLogEntry {
  id: string;
  createdAt: string;
  tenantId: string | null;
  jobId: string | null;
  customerId: string | null;
  eventType: PlatformEventType;
  service: string;
  direction: "outbound" | "inbound";
  status: PlatformEventStatus;
  httpStatusCode: number | null;
  requestSummary: string | null;
  responseSummary: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  triggeredBy: string | null;
}

export interface AuthClaims {
  sub: string;
  email: string;
  scope: RoleScope;
  tenantId?: string;
  role: string;
}

export interface PlatformSession extends AuthClaims {
  scope: "platform";
  /** Supabase auth.users UUID */
  authUserId: string;
}

export interface TenantSession extends AuthClaims {
  scope: "tenant";
  tenantId: string;
  /** Supabase auth.users UUID */
  authUserId: string;
  /** Set when a superadmin is impersonating this tenant — stores the superadmin's userId */
  impersonatedBy?: string;
}

export interface CustomerTokenPayload {
  tenantId: string;
  resourceId: string;
  resourceType: "quote" | "agreement" | "invoice" | "feedback";
  expiresAt: string;
}

export interface AutomationBlueprintDescriptor {
  filename: string;
  title: string;
  description: string;
  webhookKey: string;
}

export const automationPreferenceKeySchema = z.enum([
  "enquiry_confirmation",
  "booking_confirmation",
  "day_before_reminder",
  "invoice_reminders",
  "feedback_requests",
  "review_requests",
  "rebook_reminders",
  "morning_digest",
  "weekly_analysis",
  "advanced_make_webhooks"
]);
export type AutomationPreferenceKey = z.infer<typeof automationPreferenceKeySchema>;

export interface AutomationPreferenceDescriptor {
  key: AutomationPreferenceKey;
  title: string;
  description: string;
  group: "built_in" | "advanced";
  defaultEnabled: boolean;
  channels: string;
}

export interface AutomationRecipeDescriptor {
  key: "operator_essentials" | "cash_flow_booster" | "growth_follow_up";
  title: string;
  description: string;
  enables: AutomationPreferenceKey[];
}

export interface FeatureFlags {
  customDomain: boolean;
  noFlowLabAttribution: boolean;
  multiUser: boolean;
  apiAccess: boolean;
  unlimitedAi: boolean;
  jobsPerMonth: number | null; // null = unlimited
  aiQuotesPerMonth: number | null; // null = unlimited
}

export function getPlanFeatures(plan: TenantPlan): FeatureFlags {
  return {
    customDomain: plan !== "starter",
    noFlowLabAttribution: plan !== "starter",
    multiUser: plan === "growth",
    apiAccess: plan === "growth",
    unlimitedAi: plan === "growth",
    jobsPerMonth: plan === "starter" ? 50 : plan === "professional" ? 200 : null,
    aiQuotesPerMonth: plan === "starter" ? 50 : plan === "professional" ? 200 : null
  };
}

export interface IntegrationTestResult {
  service: IntegrationService;
  ok: boolean;
  status: IntegrationStatus;
  message: string;
  testedAt: string;
}

export interface MobileJobAction {
  jobId: string;
  type: "start_timer" | "stop_timer" | "checklist" | "photo" | "status";
  value: string;
  occurredAt: string;
}

export const serviceLabels: Record<IntegrationService, string> = {
  twilio: "Brevo SMS",
  sendgrid: "Brevo Email",
  stripe: "Stripe",
  docuseal: "DocuSeal",
  google_maps: "Google Maps",
  xero: "Xero",
  make_com: "Make.com",
  claude: "Claude AI"
};

export const eventServiceLabels: Record<string, string> = {
  ...serviceLabels,
  brevo_sms: "Brevo SMS",
  brevo_email: "Brevo Email",
  make: "Make.com",
  worker: "Worker",
  mobile_job_app: "Mobile Job App"
};

export function getServiceLabel(service: string) {
  return eventServiceLabels[service] ?? service.replace(/_/g, " ");
}

export const automationBlueprints: AutomationBlueprintDescriptor[] = [
  ["new_enquiry.json", "New enquiry", "Send confirmation and log the enquiry", "enquiryWebhookUrl"],
  ["quote_accepted.json", "Quote accepted", "Send agreement and SMS notification", "quoteAcceptedWebhookUrl"],
  ["agreement_signed.json", "Agreement signed", "Email PDF and SMS confirmation", "agreementSignedWebhookUrl"],
  ["job_scheduled.json", "Job scheduled", "Send booking confirmation", "jobScheduledWebhookUrl"],
  ["day_before_reminder.json", "Day before reminder", "Send reminders for tomorrow's jobs", "dayBeforeReminderWebhookUrl"],
  ["on_my_way.json", "On my way", "Send ETA update when operator leaves", "onMyWayWebhookUrl"],
  ["schedule_update.json", "Schedule update", "Recalculate ETAs and notify customers", "scheduleUpdateWebhookUrl"],
  ["job_complete.json", "Job complete", "Issue invoice in Xero", "jobCompleteWebhookUrl"],
  ["payment_reminder_day3.json", "Payment reminder day 3", "Remind overdue invoices after 3 days", "paymentReminderDay3WebhookUrl"],
  ["payment_reminder_day7.json", "Payment reminder day 7", "Remind overdue invoices after 7 days", "paymentReminderDay7WebhookUrl"],
  ["payment_overdue_day14.json", "Payment overdue day 14", "Flag invoices overdue by 14 days", "paymentOverdueDay14WebhookUrl"],
  ["post_job_feedback.json", "Post-job feedback", "Request feedback after completion", "postJobFeedbackWebhookUrl"],
  ["review_request.json", "Review request", "Request public review after 5-star feedback", "reviewRequestWebhookUrl"],
  ["rebook_reminder.json", "Rebook reminder", "Remind customers to rebook recurring work", "rebookReminderWebhookUrl"],
  ["time_estimate_learning.json", "Time estimate learning", "Analyse historical durations and propose updates", "timeEstimateLearningWebhookUrl"],
  ["weather_check.json", "Weather check", "Flag tomorrow's weather risks", "weatherCheckWebhookUrl"]
].map(([filename, title, description, webhookKey]) => ({
  filename,
  title,
  description,
  webhookKey
}));

export const automationPreferenceDescriptors: AutomationPreferenceDescriptor[] = [
  {
    key: "enquiry_confirmation",
    title: "Send enquiry confirmation",
    description: "Acknowledge new enquiries so the customer knows their request landed and the operator sees it in context.",
    group: "built_in",
    defaultEnabled: true,
    channels: "Email"
  },
  {
    key: "booking_confirmation",
    title: "Send booking confirmation",
    description: "Confirm the booked time when a job is scheduled or rescheduled from FlowLab.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS + Email"
  },
  {
    key: "day_before_reminder",
    title: "Send day-before job reminder",
    description: "Remind customers the morning before their scheduled job so there are no surprises on the day.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS + Email"
  },
  {
    key: "invoice_reminders",
    title: "Send invoice reminders",
    description: "Chase overdue invoices after the normal waiting period without the operator having to remember.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS"
  },
  {
    key: "feedback_requests",
    title: "Request feedback after completed work",
    description: "Ask for feedback after a job is completed so the operator keeps a clean record of customer satisfaction.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS"
  },
  {
    key: "review_requests",
    title: "Ask for reviews after 5-star feedback",
    description: "Turn happy customers into public reviews without needing a separate follow-up step.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS"
  },
  {
    key: "rebook_reminders",
    title: "Remind customers to rebook",
    description: "Bring back repeat work when seasonal or recurring jobs are due again.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS"
  },
  {
    key: "morning_digest",
    title: "Send the daily operator brief",
    description: "Deliver the next-day schedule, overdue invoices, and priority items to the business owner each morning.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS + Email"
  },
  {
    key: "weekly_analysis",
    title: "Run weekly learning analysis",
    description: "Analyse historical jobs and surface pricing and scheduling suggestions each week.",
    group: "built_in",
    defaultEnabled: true,
    channels: "Internal"
  },
  {
    key: "advanced_make_webhooks",
    title: "Send FlowLab events to Make.com",
    description: "Optional advanced automation for teams that want to push FlowLab events into Slack, Sheets, Airtable, Notion, or other tools.",
    group: "advanced",
    defaultEnabled: false,
    channels: "Webhook"
  }
];

export const automationRecipeDescriptors: AutomationRecipeDescriptor[] = [
  {
    key: "operator_essentials",
    title: "Operator essentials",
    description: "Keep the owner informed and customers reassured with confirmations and the daily brief.",
    enables: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"]
  },
  {
    key: "cash_flow_booster",
    title: "Cash flow booster",
    description: "Turn on the reminders that help invoices get paid on time without awkward manual follow-up.",
    enables: ["invoice_reminders", "morning_digest"]
  },
  {
    key: "growth_follow_up",
    title: "Growth follow-up",
    description: "Keep the pipeline warm with feedback, reviews, and rebooking nudges.",
    enables: ["feedback_requests", "review_requests", "rebook_reminders"]
  }
];

export const publicRouteTokenSchema = z.object({
  token: z.string().min(12)
});

export { logger } from "./logger";
