import { z } from "zod";

export const tenantPlanSchema = z.enum(["starter", "professional", "growth"]);
export type TenantPlan = z.infer<typeof tenantPlanSchema>;

export const tenantStatusSchema = z.enum(["trial", "active", "suspended", "cancelled"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const businessTypeSchema = z.enum([
  "plumbing",
  "electrical",
  "hvac",
  "roofing",
  "painting",
  "carpentry",
  "glazing",
  "locksmith",
  "garage_doors",
  "lawn_mowing",
  "gardening",
  "landscaping",
  "pool_service",
  "pressure_washing",
  "gutter_cleaning",
  "tree_services",
  "fencing",
  "residential_cleaning",
  "commercial_cleaning",
  "bond_cleaning",
  "pest_control",
  "carpet_cleaning",
  "window_cleaning",
  "fire_safety",
  "test_and_tag",
  "mobile_mechanic",
  "appliance_repair",
  "solar",
  "security_systems",
  // Legacy persisted values kept valid while tenants migrate to the expanded set.
  "cleaning",
  "handyman",
  "other"
]);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export type PricingModel = "area_based" | "hourly" | "flat_rate" | "callout_plus_hourly";

export type TradePresetGroup = "home_services" | "outdoor_property" | "cleaning_compliance" | "mobile_other";

export interface TradePreset {
  businessType: BusinessType;
  label: string;
  group: TradePresetGroup;
  pricingModel: PricingModel;
  defaultDurationMins: number;
  pricingRate: {
    label: string;
    baseRatePerSquareM?: number | null;
    overgrownRate?: number | null;
    heavilyOvergrownRate?: number | null;
    hourlyRate?: number | null;
    calloutFee?: number | null;
    minimumCharge: number;
    gstEnabled: boolean;
  };
  serviceTemplates: Array<{ serviceName: string; defaultPrice: number; defaultDuration: number }>;
  enquiryPrompts: string[];
  quoteChecklist: string[];
  scheduleDefaults: {
    workSchedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    serviceRadiusKm: number;
  };
  recommendedAutomations: AutomationPreferenceKey[];
}

const weekdaySchedule = (startTime = "07:00", endTime = "17:00") =>
  [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));

function preset(input: Omit<TradePreset, "scheduleDefaults" | "recommendedAutomations"> & Partial<Pick<TradePreset, "scheduleDefaults" | "recommendedAutomations">>): TradePreset {
  return {
    ...input,
    scheduleDefaults: input.scheduleDefaults ?? { workSchedule: weekdaySchedule(), serviceRadiusKm: 25 },
    recommendedAutomations: input.recommendedAutomations ?? [
      "enquiry_confirmation",
      "booking_confirmation",
      "day_before_reminder",
      "morning_digest"
    ]
  };
}

const genericChecklist = ["Confirm access details", "Confirm site condition", "Confirm customer contact details"];

export const tradePresets = [
  preset({
    businessType: "plumbing",
    label: "Plumbing",
    group: "home_services",
    pricingModel: "callout_plus_hourly",
    defaultDurationMins: 90,
    pricingRate: { label: "Default plumbing rates", calloutFee: 120, hourlyRate: 120, minimumCharge: 120, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Leak repair", defaultPrice: 180, defaultDuration: 90 },
      { serviceName: "Blocked drain", defaultPrice: 220, defaultDuration: 120 },
      { serviceName: "Tap or toilet repair", defaultPrice: 160, defaultDuration: 75 },
      { serviceName: "Hot water inspection", defaultPrice: 190, defaultDuration: 90 }
    ],
    enquiryPrompts: ["What is leaking or blocked?", "Is water currently running?", "Is access available today?"],
    quoteChecklist: ["Confirm urgency", "Confirm fixtures and access", "Allow parts separately if unknown"]
  }),
  preset({
    businessType: "electrical",
    label: "Electrical",
    group: "home_services",
    pricingModel: "callout_plus_hourly",
    defaultDurationMins: 90,
    pricingRate: { label: "Default electrical rates", calloutFee: 130, hourlyRate: 125, minimumCharge: 130, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Power fault diagnosis", defaultPrice: 180, defaultDuration: 90 },
      { serviceName: "Light or fan install", defaultPrice: 220, defaultDuration: 120 },
      { serviceName: "Switchboard check", defaultPrice: 260, defaultDuration: 120 },
      { serviceName: "Smoke alarm service", defaultPrice: 145, defaultDuration: 60 }
    ],
    enquiryPrompts: ["What fixture or circuit is affected?", "Is power currently off?", "Is switchboard access available?"],
    quoteChecklist: ["Confirm licence-sensitive work", "Confirm parts required", "Confirm power isolation requirements"]
  }),
  preset({
    businessType: "hvac",
    label: "HVAC / air conditioning",
    group: "home_services",
    pricingModel: "callout_plus_hourly",
    defaultDurationMins: 120,
    pricingRate: { label: "Default HVAC rates", calloutFee: 140, hourlyRate: 130, minimumCharge: 140, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "AC service", defaultPrice: 180, defaultDuration: 90 },
      { serviceName: "Fault diagnosis", defaultPrice: 190, defaultDuration: 90 },
      { serviceName: "Filter clean", defaultPrice: 130, defaultDuration: 60 },
      { serviceName: "Split system install quote", defaultPrice: 0, defaultDuration: 45 }
    ],
    enquiryPrompts: ["What unit brand/type?", "What issue is occurring?", "Is roof or outdoor unit access available?"],
    quoteChecklist: ["Confirm unit type", "Confirm access and height", "Separate install quote if scope is broad"]
  }),
  preset({
    businessType: "lawn_mowing",
    label: "Lawn mowing",
    group: "outdoor_property",
    pricingModel: "area_based",
    defaultDurationMins: 60,
    pricingRate: { label: "Default lawn rates", baseRatePerSquareM: 2.2, overgrownRate: 3.1, heavilyOvergrownRate: 4.2, minimumCharge: 55, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Mow and edge", defaultPrice: 75, defaultDuration: 60 },
      { serviceName: "Hedge trim", defaultPrice: 95, defaultDuration: 75 },
      { serviceName: "Green waste removal", defaultPrice: 65, defaultDuration: 45 },
      { serviceName: "Garden tidy", defaultPrice: 140, defaultDuration: 120 }
    ],
    enquiryPrompts: ["Approximate lawn size?", "Is it overgrown?", "Is green waste removal needed?"],
    quoteChecklist: ["Confirm area estimate", "Confirm overgrowth", "Check weather risk"]
  }),
  preset({
    businessType: "gardening",
    label: "Gardening",
    group: "outdoor_property",
    pricingModel: "hourly",
    defaultDurationMins: 120,
    pricingRate: { label: "Default gardening rates", hourlyRate: 85, minimumCharge: 95, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Garden maintenance", defaultPrice: 170, defaultDuration: 120 },
      { serviceName: "Weeding and pruning", defaultPrice: 150, defaultDuration: 120 },
      { serviceName: "Mulch install", defaultPrice: 220, defaultDuration: 180 },
      { serviceName: "Seasonal tidy-up", defaultPrice: 240, defaultDuration: 180 }
    ],
    enquiryPrompts: ["What areas need attention?", "Is waste removal required?", "Any photos available?"],
    quoteChecklist: ["Confirm waste disposal", "Confirm materials", "Confirm access"]
  }),
  preset({
    businessType: "landscaping",
    label: "Landscaping",
    group: "outdoor_property",
    pricingModel: "hourly",
    defaultDurationMins: 240,
    pricingRate: { label: "Default landscaping rates", hourlyRate: 95, calloutFee: 120, minimumCharge: 180, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Site consult", defaultPrice: 120, defaultDuration: 60 },
      { serviceName: "Small install", defaultPrice: 450, defaultDuration: 240 },
      { serviceName: "Turf preparation", defaultPrice: 550, defaultDuration: 300 },
      { serviceName: "Garden bed build", defaultPrice: 650, defaultDuration: 360 }
    ],
    enquiryPrompts: ["What area needs work?", "Do you have measurements/photos?", "Are materials required?"],
    quoteChecklist: ["Confirm measurements", "Separate materials", "Confirm access for equipment"]
  }),
  preset({
    businessType: "residential_cleaning",
    label: "Residential cleaning",
    group: "cleaning_compliance",
    pricingModel: "hourly",
    defaultDurationMins: 120,
    pricingRate: { label: "Default cleaning rates", hourlyRate: 70, minimumCharge: 120, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Standard clean", defaultPrice: 140, defaultDuration: 120 },
      { serviceName: "Deep clean", defaultPrice: 260, defaultDuration: 240 },
      { serviceName: "Kitchen and bathrooms", defaultPrice: 180, defaultDuration: 150 },
      { serviceName: "Recurring clean", defaultPrice: 130, defaultDuration: 120 }
    ],
    enquiryPrompts: ["How many bedrooms/bathrooms?", "Is this one-off or recurring?", "Any priority rooms?"],
    quoteChecklist: ["Confirm rooms", "Confirm supplies/access", "Confirm recurring cadence"]
  }),
  preset({
    businessType: "commercial_cleaning",
    label: "Commercial cleaning",
    group: "cleaning_compliance",
    pricingModel: "hourly",
    defaultDurationMins: 180,
    pricingRate: { label: "Default commercial cleaning rates", hourlyRate: 75, minimumCharge: 180, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Office clean", defaultPrice: 220, defaultDuration: 180 },
      { serviceName: "Amenities clean", defaultPrice: 150, defaultDuration: 90 },
      { serviceName: "After-hours clean", defaultPrice: 260, defaultDuration: 180 },
      { serviceName: "Recurring site service", defaultPrice: 240, defaultDuration: 180 }
    ],
    enquiryPrompts: ["What type of site?", "Approximate floor area?", "Preferred cleaning schedule?"],
    quoteChecklist: ["Confirm keys/access", "Confirm after-hours requirements", "Confirm recurrence"]
  }),
  preset({
    businessType: "bond_cleaning",
    label: "Bond / end-of-lease cleaning",
    group: "cleaning_compliance",
    pricingModel: "flat_rate",
    defaultDurationMins: 360,
    pricingRate: { label: "Default bond cleaning rates", calloutFee: 380, minimumCharge: 380, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "1-2 bedroom bond clean", defaultPrice: 420, defaultDuration: 360 },
      { serviceName: "3 bedroom bond clean", defaultPrice: 580, defaultDuration: 480 },
      { serviceName: "Carpet add-on", defaultPrice: 120, defaultDuration: 90 },
      { serviceName: "Oven/detail add-on", defaultPrice: 95, defaultDuration: 60 }
    ],
    enquiryPrompts: ["How many bedrooms/bathrooms?", "Carpets or oven included?", "When is handover?"],
    quoteChecklist: ["Confirm property size", "Confirm add-ons", "Confirm deadline"]
  }),
  preset({
    businessType: "pest_control",
    label: "Pest control",
    group: "cleaning_compliance",
    pricingModel: "flat_rate",
    defaultDurationMins: 90,
    pricingRate: { label: "Default pest rates", calloutFee: 180, minimumCharge: 180, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "General pest treatment", defaultPrice: 220, defaultDuration: 90 },
      { serviceName: "Termite inspection", defaultPrice: 280, defaultDuration: 120 },
      { serviceName: "Rodent treatment", defaultPrice: 240, defaultDuration: 90 },
      { serviceName: "End-of-lease pest treatment", defaultPrice: 170, defaultDuration: 60 }
    ],
    enquiryPrompts: ["What pest issue?", "Indoor, outdoor, or both?", "Any pets or children on site?"],
    quoteChecklist: ["Confirm pest type", "Confirm treatment area", "Confirm safety notes"]
  }),
  preset({
    businessType: "pool_service",
    label: "Pool service",
    group: "outdoor_property",
    pricingModel: "callout_plus_hourly",
    defaultDurationMins: 75,
    pricingRate: { label: "Default pool service rates", calloutFee: 95, hourlyRate: 85, minimumCharge: 95, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Regular pool service", defaultPrice: 110, defaultDuration: 75 },
      { serviceName: "Green pool recovery", defaultPrice: 260, defaultDuration: 180 },
      { serviceName: "Equipment check", defaultPrice: 130, defaultDuration: 75 },
      { serviceName: "Chemical balance", defaultPrice: 95, defaultDuration: 45 }
    ],
    enquiryPrompts: ["Pool size/type?", "Is the water green or cloudy?", "Any equipment issues?"],
    quoteChecklist: ["Confirm chemical costs", "Confirm access", "Confirm repeat service cadence"]
  })
] as const satisfies readonly TradePreset[];

const genericPresetByType: Partial<Record<BusinessType, Omit<TradePreset, "businessType" | "label" | "group">>> = {
  roofing: { pricingModel: "callout_plus_hourly", defaultDurationMins: 120, pricingRate: { label: "Default roofing rates", calloutFee: 160, hourlyRate: 130, minimumCharge: 180, gstEnabled: true }, serviceTemplates: [{ serviceName: "Leak inspection", defaultPrice: 180, defaultDuration: 90 }, { serviceName: "Minor roof repair", defaultPrice: 320, defaultDuration: 180 }, { serviceName: "Gutter/roof report", defaultPrice: 220, defaultDuration: 120 }], enquiryPrompts: ["What roof issue?", "Is there active leaking?", "Is roof access safe?"], quoteChecklist: genericChecklist, scheduleDefaults: { workSchedule: weekdaySchedule(), serviceRadiusKm: 30 }, recommendedAutomations: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"] },
  painting: { pricingModel: "hourly", defaultDurationMins: 240, pricingRate: { label: "Default painting rates", hourlyRate: 80, calloutFee: 120, minimumCharge: 180, gstEnabled: true }, serviceTemplates: [{ serviceName: "Patch and paint", defaultPrice: 240, defaultDuration: 180 }, { serviceName: "Room repaint", defaultPrice: 650, defaultDuration: 480 }, { serviceName: "Exterior touch-up", defaultPrice: 420, defaultDuration: 300 }], enquiryPrompts: ["Interior or exterior?", "How many rooms/walls?", "Paint supplied?"], quoteChecklist: genericChecklist, scheduleDefaults: { workSchedule: weekdaySchedule("08:00", "17:00"), serviceRadiusKm: 25 }, recommendedAutomations: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"] },
  handyman: { pricingModel: "hourly", defaultDurationMins: 120, pricingRate: { label: "Default handyman rates", hourlyRate: 85, calloutFee: 95, minimumCharge: 120, gstEnabled: true }, serviceTemplates: [{ serviceName: "Small repair", defaultPrice: 140, defaultDuration: 90 }, { serviceName: "Install or assembly", defaultPrice: 180, defaultDuration: 120 }, { serviceName: "Half-day booking", defaultPrice: 320, defaultDuration: 240 }], enquiryPrompts: ["What needs fixing/installing?", "Any photos?", "Are parts supplied?"], quoteChecklist: genericChecklist, scheduleDefaults: { workSchedule: weekdaySchedule(), serviceRadiusKm: 25 }, recommendedAutomations: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"] },
  cleaning: { pricingModel: "hourly", defaultDurationMins: 120, pricingRate: { label: "Default cleaning rates", hourlyRate: 70, minimumCharge: 120, gstEnabled: true }, serviceTemplates: [{ serviceName: "Standard clean", defaultPrice: 140, defaultDuration: 120 }, { serviceName: "Deep clean", defaultPrice: 260, defaultDuration: 240 }, { serviceName: "Recurring clean", defaultPrice: 130, defaultDuration: 120 }], enquiryPrompts: ["How many rooms?", "One-off or recurring?", "Any priority areas?"], quoteChecklist: genericChecklist, scheduleDefaults: { workSchedule: weekdaySchedule(), serviceRadiusKm: 25 }, recommendedAutomations: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"] }
};

const tradeLabels: Record<BusinessType, { label: string; group: TradePresetGroup }> = {
  plumbing: { label: "Plumbing", group: "home_services" },
  electrical: { label: "Electrical", group: "home_services" },
  hvac: { label: "HVAC / air conditioning", group: "home_services" },
  roofing: { label: "Roofing", group: "home_services" },
  painting: { label: "Painting", group: "home_services" },
  carpentry: { label: "Carpentry", group: "home_services" },
  glazing: { label: "Glazing", group: "home_services" },
  locksmith: { label: "Locksmith", group: "home_services" },
  garage_doors: { label: "Garage doors", group: "home_services" },
  lawn_mowing: { label: "Lawn mowing", group: "outdoor_property" },
  gardening: { label: "Gardening", group: "outdoor_property" },
  landscaping: { label: "Landscaping", group: "outdoor_property" },
  pool_service: { label: "Pool service", group: "outdoor_property" },
  pressure_washing: { label: "Pressure washing", group: "outdoor_property" },
  gutter_cleaning: { label: "Gutter cleaning", group: "outdoor_property" },
  tree_services: { label: "Tree services", group: "outdoor_property" },
  fencing: { label: "Fencing", group: "outdoor_property" },
  residential_cleaning: { label: "Residential cleaning", group: "cleaning_compliance" },
  commercial_cleaning: { label: "Commercial cleaning", group: "cleaning_compliance" },
  bond_cleaning: { label: "Bond / end-of-lease cleaning", group: "cleaning_compliance" },
  pest_control: { label: "Pest control", group: "cleaning_compliance" },
  carpet_cleaning: { label: "Carpet cleaning", group: "cleaning_compliance" },
  window_cleaning: { label: "Window cleaning", group: "cleaning_compliance" },
  fire_safety: { label: "Fire safety", group: "cleaning_compliance" },
  test_and_tag: { label: "Test and tag", group: "cleaning_compliance" },
  mobile_mechanic: { label: "Mobile mechanic", group: "mobile_other" },
  appliance_repair: { label: "Appliance repair", group: "mobile_other" },
  solar: { label: "Solar", group: "mobile_other" },
  security_systems: { label: "Security systems", group: "mobile_other" },
  cleaning: { label: "Cleaning", group: "cleaning_compliance" },
  handyman: { label: "Handyman", group: "home_services" },
  other: { label: "Other service business", group: "mobile_other" }
};

const genericTemplate = (businessType: BusinessType): TradePreset => {
  const meta = tradeLabels[businessType];
  const template = genericPresetByType[businessType] ?? {
    pricingModel: "callout_plus_hourly" as const,
    defaultDurationMins: 90,
    pricingRate: { label: `Default ${meta.label.toLowerCase()} rates`, calloutFee: 120, hourlyRate: 95, minimumCharge: 120, gstEnabled: true },
    serviceTemplates: [
      { serviceName: "Call-out / assessment", defaultPrice: 120, defaultDuration: 60 },
      { serviceName: "Standard service", defaultPrice: 180, defaultDuration: 120 },
      { serviceName: "Half-day booking", defaultPrice: 360, defaultDuration: 240 }
    ],
    enquiryPrompts: ["What needs to be done?", "Where is the job located?", "Any photos or access notes?"],
    quoteChecklist: genericChecklist,
    scheduleDefaults: { workSchedule: weekdaySchedule(), serviceRadiusKm: 25 },
    recommendedAutomations: ["enquiry_confirmation", "booking_confirmation", "day_before_reminder", "morning_digest"] as AutomationPreferenceKey[]
  };

  return {
    businessType,
    label: meta.label,
    group: meta.group,
    ...template
  };
};

export function getTradePreset(businessType: BusinessType | string | null | undefined): TradePreset {
  const parsed = businessTypeSchema.safeParse(businessType ?? "other");
  const type = parsed.success ? parsed.data : "other";
  return tradePresets.find((item) => item.businessType === type) ?? genericTemplate(type);
}

export const tradePresetOptions = businessTypeSchema.options.map((businessType) => {
  const preset = getTradePreset(businessType);
  return { businessType, label: preset.label, group: preset.group };
});

/**
 * Returns the appropriate pricing model for a given business type.
 * - area_based: prices by m² (lawn mowing, gardening)
 * - hourly: prices by hours worked (cleaning, handyman, pool service)
 * - flat_rate: fixed callout/service prices (pest control, other)
 */
export function getPricingModel(businessType: BusinessType | string | null | undefined): PricingModel {
  return getTradePreset(businessType).pricingModel;
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
  serviceBaseAddress: string | null;
  serviceBasePlaceId: string | null;
  serviceBaseLat: number | null;
  serviceBaseLng: number | null;
  serviceRadiusKm: number | null;
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
  managementMode?: IntegrationManagementMode;
  platformManaged?: boolean;
  usageThisMonth?: number;
}

export const integrationManagementModeSchema = z.enum(["platform_managed", "tenant_managed", "connected_account", "advanced_optional"]);
export type IntegrationManagementMode = z.infer<typeof integrationManagementModeSchema>;

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
  onboardingCompleted: boolean;
  onboardingStep: number;
  tenantStatus: TenantStatus;
  tenantPlan: TenantPlan;
  trialEndsAt: string | null;
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
  "job_completion",
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
    key: "job_completion",
    title: "Send job completion notification",
    description: "Notify the customer when their job is complete and invite them to leave feedback.",
    group: "built_in",
    defaultEnabled: true,
    channels: "SMS + Email"
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
