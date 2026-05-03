import crypto from "node:crypto";

import {
  PrismaClient,
  Prisma,
  type Agreement,
  type BusinessType,
  type TenantPlan,
  IntegrationService as PrismaIntegrationService,
  IntegrationStatus as PrismaIntegrationStatus
} from "@prisma/client";
import { signCustomerToken, verifyCustomerToken } from "@flowlab/auth";
import type {
  AutomationPreferenceKey,
  IntegrationService,
  IntegrationStatus,
  MobileJobAction,
  PlatformEventLogEntry,
  TenantContext,
  TenantIntegration,
  TenantProfile
} from "@flowlab/contracts";
import {
  automationPreferenceDescriptors,
  automationRecipeDescriptors,
  getPlanFeatures,
  getPricingModel
} from "@flowlab/contracts";
import {
  buildTenantUrl,
  getCanonicalRootDomain,
  getExpectedTenantCname
} from "@flowlab/contracts/server";
import {
  buildDocuSealRequest,
  createDocuSealBuilderToken,
  createDocuSealSubmissionFromTemplate,
  createDocuSealTemplateFromFile,
  decryptJson,
  encryptJson,
  generateServiceAgreementTemplateDocx,
  getDocuSealTemplate,
  sendDocuSealSignatureRequest,
  validateDocuSealTemplateFields
} from "@flowlab/integrations";
import { generateAIQuote } from "@flowlab/integrations/claude";
import type { XeroCredentials } from "@flowlab/integrations/xero";
import { getXeroInvoice } from "@flowlab/integrations/xero";
import { assessJobWeatherRisks } from "@flowlab/integrations/bom";
import { optimiseJobRoute, resolveGoogleMapsApiKey } from "@flowlab/integrations/google-maps";
import { pickMatchedCustomerId } from "./customer-matching";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const AUTOMATION_MAX_ATTEMPTS = 5;
const IMPERSONATION_NONCE_PREFIX = "impersonation_nonce:";

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function toTenantProfile(record: Prisma.TenantProfileGetPayload<{ include: { tenant: true } }>): TenantProfile {
  return {
    tenantId: record.tenantId,
    slug: record.tenant.slug,
    businessName: record.businessName,
    tagline: record.tagline,
    logoUrl: record.logoUrl,
    faviconUrl: record.faviconUrl,
    primaryColour: record.primaryColour,
    secondaryColour: record.secondaryColour,
    accentColour: record.accentColour,
    fontPreference: record.fontPreference,
    customDomain: record.customDomain,
    customDomainVerified: record.customDomainVerified,
    abn: record.abn,
    phone: record.phone,
    email: record.email,
    address: record.address,
    suburb: record.suburb,
    state: record.state,
    postcode: record.postcode,
    serviceAreaSuburbs: record.serviceAreaSuburbs,
    businessType: record.businessType,
    timezone: record.timezone
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isNonNullable<T>(value: T | null | undefined): value is T {
  return value != null;
}

function hashImpersonationNonce(nonce: string) {
  return crypto.createHash("sha256").update(nonce).digest("hex");
}

function getLocalDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(lookup.get("year"));
  const month = Number(lookup.get("month"));
  const day = Number(lookup.get("day"));
  const hour = Number(lookup.get("hour"));
  const minute = Number(lookup.get("minute"));
  const weekday = (lookup.get("weekday") ?? "").toLowerCase();

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    dateKey: `${lookup.get("year")}-${lookup.get("month")}-${lookup.get("day")}`
  };
}

function getIsoWeekKey(parts: { year: number; month: number; day: number }) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const automationPreferenceDefaults = Object.fromEntries(
  automationPreferenceDescriptors.map((descriptor) => [descriptor.key, descriptor.defaultEnabled])
) as Record<AutomationPreferenceKey, boolean>;

const automationPreferenceKinds: Record<AutomationPreferenceKey, string[]> = {
  enquiry_confirmation: ["enquiry.received"],
  booking_confirmation: ["job.scheduled"],
  day_before_reminder: ["job.day_before_reminder"],
  invoice_reminders: ["billing.payment_reminder", "billing.payment_reminder_day3", "billing.payment_reminder_day7", "billing.payment_overdue_day14"],
  feedback_requests: ["retention.feedback_request"],
  review_requests: ["retention.review_request"],
  rebook_reminders: ["retention.rebook_reminder"],
  morning_digest: ["operator.morning_digest"],
  weekly_analysis: ["learning.weekly_analysis", "learning.weather_check"],
  advanced_make_webhooks: []
};

function buildAutomationPreferenceMap(
  rows: Array<{ key: string; enabled: boolean }>
): Record<AutomationPreferenceKey, boolean> {
  const map = { ...automationPreferenceDefaults };

  for (const row of rows) {
    if (row.key in map) {
      map[row.key as AutomationPreferenceKey] = row.enabled;
    }
  }

  return map;
}

export async function listTenants(opts: { limit?: number; cursor?: string } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  return prisma.tenant.findMany({
    take: limit,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      slug: true,
      status: true,
      plan: true,
      trialEndsAt: true,
      billingEmail: true,
      subscriptionStartDate: true,
      monthlyFee: true,
      stripeCustomerId: true,
      notes: true,
      profile: true,
      users: {
        select: {
          id: true,
          tenantId: true,
          authUserId: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          lastLoginAt: true,
          onboardingCompleted: true,
          onboardingStep: true
        }
      },
      integrations: {
        select: {
          id: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          service: true,
          status: true,
          lastTestedAt: true,
          lastTestResult: true,
          lastErrorMessage: true,
          webhookUrl: true
        }
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 3
      },
      _count: {
        select: {
          jobs: true,
          invoices: true,
          customers: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function getPlatformOverview() {
  const [tenants, jobs, invoices, events, platformIntegrations] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        profile: true,
        integrations: true,
        _count: {
          select: {
            customers: true,
            jobs: true,
            invoices: true
          }
        }
      }
    }),
    prisma.job.count(),
    prisma.invoice.count(),
    prisma.platformEventLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.platformIntegration.findMany({
      orderBy: { service: "asc" }
    })
  ]);

  const totalRevenue = tenants.reduce((sum: number, tenant: (typeof tenants)[number]) => sum + tenant.monthlyFee, 0);
  const activeErrors = events.filter((event: (typeof events)[number]) => event.status === "failed").length;

  return {
    tenants,
    stats: {
      totalActiveTenants: tenants.filter((tenant: (typeof tenants)[number]) => tenant.status === "active" || tenant.status === "trial").length,
      trials: tenants.filter((tenant: (typeof tenants)[number]) => tenant.status === "trial").length,
      jobs,
      invoices,
      totalRevenue,
      activeErrors
    },
    events,
    platformIntegrations
  };
}

export async function countPublicTenantTrials() {
  return prisma.tenant.count({
    where: {
      status: {
        in: ["trial", "active"]
      }
    }
  });
}

export async function resolveTenantContext(host: string): Promise<TenantContext | null> {
  const normalizedHost = host.split(":")[0].toLowerCase();
  const rootDomain = getCanonicalRootDomain();
  const whereOr: Prisma.TenantProfileWhereInput[] = [{ customDomain: normalizedHost }];

  if (normalizedHost.endsWith(`.${rootDomain}`)) {
    whereOr.push({ tenant: { slug: normalizedHost.replace(`.${rootDomain}`, "") } });
  }

  const profile = await prisma.tenantProfile.findFirst({
    where: {
      OR: whereOr
    },
    include: { tenant: true }
  });

  if (!profile) {
    return null;
  }

  const branding = toTenantProfile(profile);

  return {
    tenantId: profile.tenantId,
    slug: profile.tenant.slug,
    host: normalizedHost,
    customDomain: profile.customDomain,
    isCustomDomain: Boolean(profile.customDomain && profile.customDomain === normalizedHost),
    plan: profile.tenant.plan,
    status: profile.tenant.status,
    branding
  };
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      plan: true,
      profile: true
    }
  });
}

export async function findTenantUserInTenant(email: string, tenantId: string) {
  return prisma.tenantUser.findFirst({
    where: { email, tenantId },
    include: {
      tenant: {
        include: { profile: true }
      }
    }
  });
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      plan: true,
      trialEndsAt: true,
      billingEmail: true,
      subscriptionStartDate: true,
      monthlyFee: true,
      stripeCustomerId: true,
      notes: true,
      profile: true,
      users: {
        select: {
          id: true,
          tenantId: true,
          authUserId: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          lastLoginAt: true,
          onboardingCompleted: true,
          onboardingStep: true
        }
      },
      integrations: {
        select: {
          id: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          service: true,
          status: true,
          lastTestedAt: true,
          lastTestResult: true,
          lastErrorMessage: true,
          webhookUrl: true,
          oauthExpiresAt: true
        }
      }
    }
  });
}

export async function getTenantDashboardSnapshot(tenantId: string) {
  const [tenant, integrations, events, customers, jobs, invoices, automationHealth, monthlyJobCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        status: true,
        plan: true,
        trialEndsAt: true,
        monthlyFee: true,
        profile: true,
        users: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            lastLoginAt: true,
            onboardingCompleted: true,
            onboardingStep: true
          }
        }
      }
    }),
    prisma.tenantIntegration.findMany({
      where: { tenantId },
      orderBy: { service: "asc" },
      select: {
        id: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        service: true,
        status: true,
        lastTestedAt: true,
        lastTestResult: true,
        lastErrorMessage: true,
        webhookUrl: true,
        oauthExpiresAt: true
      }
    }),
    prisma.platformEventLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.job.findMany({
      where: { tenantId },
      include: {
        customer: true,
        invoice: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.invoice.findMany({
      where: { tenantId },
      include: { customer: true, job: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    getTenantAutomationHealth(tenantId),
    prisma.job.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }
    })
  ]);

  return { tenant, integrations, events, customers, jobs, invoices, automationHealth, monthlyJobCount };
}

export async function getTenantQuotes(tenantId: string) {
  return prisma.quote.findMany({
    where: { tenantId },
    include: {
      customer: true,
      job: {
        select: {
          id: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTenantCustomers(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId },
    include: {
      quotes: true,
      invoices: true,
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 3
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTenantSchedulerSnapshot(tenantId: string) {
  const [workSchedule, commitments, timeOff, jobs] = await Promise.all([
    prisma.workSchedule.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: "asc" }
    }),
    prisma.personalCommitment.findMany({
      where: { tenantId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    }),
    prisma.timeOff.findMany({
      where: {
        tenantId,
        endAt: {
          gte: new Date()
        }
      },
      orderBy: { startAt: "asc" }
    }),
    prisma.job.findMany({
      where: {
        tenantId,
        scheduledFor: {
          not: null
        }
      },
      include: {
        customer: true,
        invoice: {
          select: { id: true }
        }
      },
      orderBy: { scheduledFor: "asc" },
      take: 20
    })
  ]);

  return { workSchedule, commitments, timeOff, jobs };
}

export async function getTenantInvoices(tenantId: string) {
  return prisma.invoice.findMany({
    where: { tenantId },
    include: { customer: true, job: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTenantAgreements(tenantId: string) {
  return prisma.agreement.findMany({
    where: { tenantId },
    include: {
      customer: true,
      contractTemplate: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTenantAgreementTemplates(tenantId: string) {
  return prisma.tenantAgreementTemplate.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
}

export async function getTenantSettingsSnapshot(tenantId: string) {
  const [tenant, profile, pricingRates, serviceTemplates, workSchedule, commitments, agreementTemplates] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId }
    }),
    prisma.tenantProfile.findUnique({
      where: { tenantId }
    }),
    prisma.pricingRate.findMany({
      where: { tenantId },
      orderBy: { label: "asc" }
    }),
    prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    }),
    prisma.workSchedule.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: "asc" }
    }),
    prisma.personalCommitment.findMany({
      where: { tenantId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    }),
    prisma.tenantAgreementTemplate.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    })
  ]);

  return { tenant, profile, pricingRates, serviceTemplates, workSchedule, commitments, agreementTemplates };
}

function timeStringToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateToDayAndMinutes(date: Date) {
  return {
    dayOfWeek: date.getDay(),
    minutes: date.getHours() * 60 + date.getMinutes()
  };
}

export async function getSchedulerRecommendations(tenantId: string) {
  const [snapshot, tenantRecord, googleMapsRecord] = await Promise.all([
    getTenantSchedulerSnapshot(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { profile: true }
    }),
    prisma.tenantIntegration.findUnique({
      where: { tenantId_service: { tenantId, service: PrismaIntegrationService.google_maps } }
    })
  ]);

  const tenantState = tenantRecord?.profile?.state ?? "QLD";
  const googleCreds = googleMapsRecord?.credentialsJson ? decryptJson(googleMapsRecord.credentialsJson) : {};
  const googleApiKey = resolveGoogleMapsApiKey(googleCreds);

  // Assess weather risk for jobs scheduled in the next 3 days
  const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const upcomingJobs = snapshot.jobs.filter(
    (j) => j.scheduledFor && j.scheduledFor <= threeDaysOut && j.scheduledFor >= new Date()
  );

  const [weatherRisks, routeResult] = await Promise.all([
    upcomingJobs.length > 0
      ? assessJobWeatherRisks(
          upcomingJobs.map((j) => ({
            id: j.id,
            suburb: j.suburb ?? j.customer.suburb ?? tenantRecord?.profile?.suburb ?? "Unknown",
            state: tenantState,
            scheduledDate: j.scheduledFor!.toISOString()
          }))
        ).catch(() => [])
      : Promise.resolve([]),
    snapshot.jobs.length > 1
      ? optimiseJobRoute(
          snapshot.jobs
            .filter((j) => j.address)
            .map((j) => ({
              id: j.id,
              address: `${j.address ?? j.customer.address ?? ""} ${j.suburb ?? j.customer.suburb ?? ""}`.trim(),
              suburb: j.suburb ?? j.customer.suburb ?? "",
              estimatedDurationMins: j.estimatedHours ? Math.round(j.estimatedHours * 60) : 60
            })),
          { apiKey: googleApiKey, startAddress: tenantRecord?.profile?.address ?? undefined }
        ).catch(() => null)
      : Promise.resolve(null)
  ]);

  const weatherRiskMap = new Map(weatherRisks.map((r) => [r.jobId, r]));
  const routeStopMap = new Map(routeResult?.stops.map((s) => [s.jobId, s]) ?? []);

  // Update weatherRisk flag in DB for jobs with high/moderate risk (non-blocking)
  for (const risk of weatherRisks) {
    if (risk.risk === "high" || risk.risk === "moderate") {
      prisma.job.update({ where: { id: risk.jobId }, data: { weatherRisk: true } }).catch(() => {});
    }
  }

  return snapshot.jobs.map((job) => {
    const scheduled = job.scheduledFor ? dateToDayAndMinutes(job.scheduledFor) : null;
    const workWindow = scheduled
      ? snapshot.workSchedule.find((slot) => slot.dayOfWeek === scheduled.dayOfWeek)
      : null;
    const commitment = scheduled
      ? snapshot.commitments.find((entry) => {
          if (entry.dayOfWeek !== scheduled.dayOfWeek) return false;
          const start = timeStringToMinutes(entry.startTime);
          const end = timeStringToMinutes(entry.endTime);
          return scheduled.minutes >= start && scheduled.minutes <= end;
        })
      : null;
    const timeOff = job.scheduledFor
      ? snapshot.timeOff.find((entry) => job.scheduledFor && job.scheduledFor >= entry.startAt && job.scheduledFor <= entry.endAt)
      : null;

    const weather = weatherRiskMap.get(job.id);
    const hasWeatherRisk = job.weatherRisk || weather?.risk === "high" || weather?.risk === "moderate";
    const routeStop = routeStopMap.get(job.id);

    const reasons = [
      !workWindow ? "Outside configured work hours" : null,
      commitment ? `Conflicts with ${commitment.title}` : null,
      timeOff ? `Falls during time off: ${timeOff.title}` : null,
      hasWeatherRisk
        ? weather?.forecast?.rainProbabilityPct != null
          ? `Weather risk: ${weather.forecast.rainProbabilityPct}% rain probability`
          : "Weather risk flagged for this visit"
        : null
    ].filter(isNonNullable);

    const severity: "ok" | "high" | "medium" =
      reasons.length === 0 ? "ok" : hasWeatherRisk || timeOff ? "high" : "medium";

    return {
      jobId: job.id,
      customerId: job.customer.id,
      summary: job.summary,
      customerName: `${job.customer.firstName} ${job.customer.lastName}`,
      scheduledFor: job.scheduledFor,
      severity,
      reasons,
      suggestedAction:
        reasons.length === 0
          ? "Keep as scheduled"
          : commitment || timeOff
            ? "Move to the next available work window"
            : hasWeatherRisk
              ? "Contact customer and prepare reschedule notice"
              : "Adjust to fit configured work hours",
      route: routeStop
        ? {
            order: routeStop.order,
            travelTimeFromPreviousMins: routeStop.travelTimeFromPreviousMins,
            estimatedArrival: routeStop.estimatedArrival
          }
        : null
    };
  });
}

export async function getCrmSnapshot(tenantId: string) {
  const [customers, communications, feedback, overdueInvoices, enquiries] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      include: {
        quotes: true,
        invoices: true,
        jobs: { orderBy: { createdAt: "desc" }, take: 5 }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.communication.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.feedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["sent", "overdue"] },
        dueAt: { lt: new Date() }
      },
      include: { customer: true },
      orderBy: { dueAt: "asc" }
    }),
    prisma.enquiry.findMany({
      where: { tenantId },
      include: {
        customer: true,
        quote: {
          select: {
            id: true,
            accessToken: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return {
    customers,
    communications,
    feedback,
    overdueInvoices,
    enquiries
  };
}

export async function getCustomerCrmRecord(tenantId: string, customerId: string) {
  const [customer, communications, feedback, reminders, enquiries] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        enquiries: { orderBy: { createdAt: "desc" }, take: 20 },
        jobs: { orderBy: { createdAt: "desc" }, take: 20 },
        quotes: { orderBy: { createdAt: "desc" }, take: 20 },
        agreements: { orderBy: { createdAt: "desc" }, take: 20 },
        invoices: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    }),
    prisma.communication.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.feedback.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.rebookReminder.findMany({
      where: { tenantId, customerId },
      orderBy: { dueAt: "asc" },
      take: 20
    }),
    prisma.enquiry.findMany({
      where: { tenantId, customerId },
      include: {
        quote: {
          select: {
            id: true,
            accessToken: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  if (!customer) {
    return null;
  }

  return {
    customer,
    communications,
    feedback,
    reminders,
    enquiries
  };
}

export async function getTenantJobRecord(tenantId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId },
    include: {
      customer: true,
      invoice: true
    }
  });

  if (!job) {
    return null;
  }

  const [feedback, jobCommunications, customerCommunications, otherCustomerInvoices] = await Promise.all([
    prisma.feedback.findMany({
      where: { tenantId, OR: [{ jobId }, { customerId: job.customerId }] },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.communication.findMany({
      where: { tenantId, jobId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.communication.findMany({
      where: {
        tenantId,
        customerId: job.customerId,
        jobId: null,
        invoiceId: null
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        customerId: job.customerId,
        ...(job.invoice ? { id: { not: job.invoice.id } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return {
    job,
    feedback,
    jobCommunications,
    customerCommunications,
    otherCustomerInvoices
  };
}

/**
 * Returns all jobs for the tenant grouped by status — used for the job board view.
 * Each job includes the customer name and whether an invoice exists.
 */
export async function getJobBoard(tenantId: string) {
  const jobs = await prisma.job.findMany({
    where: { tenantId },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      invoice: { select: { id: true, number: true, status: true, xeroInvoiceId: true } }
    },
    orderBy: { scheduledFor: "asc" }
  });

  const statuses = ["quoted", "scheduled", "in_progress", "complete", "invoiced", "paid"] as const;
  type JobStatus = typeof statuses[number];

  const grouped: Record<JobStatus, typeof jobs> = {
    quoted: [],
    scheduled: [],
    in_progress: [],
    complete: [],
    invoiced: [],
    paid: []
  };

  for (const job of jobs) {
    const status = job.status as JobStatus;
    if (status in grouped) {
      grouped[status].push(job);
    }
  }

  return { jobs, grouped, statuses };
}

export async function createTenantJob(input: {
  tenantId: string;
  customerId: string;
  summary: string;
  address?: string | null;
  suburb?: string | null;
  scheduledFor?: Date | null;
  estimatedHours?: number | null;
}) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId: input.tenantId }
  });

  if (!customer) {
    throw new Error("Customer not found for tenant");
  }

  const job = await prisma.job.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      summary: input.summary,
      address: input.address ?? customer.address,
      suburb: input.suburb ?? customer.suburb,
      scheduledFor: input.scheduledFor ?? null,
      estimatedHours: input.estimatedHours ?? null,
      status: "scheduled"
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      invoice: { select: { id: true } }
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: `Job created for ${job.customer.firstName} ${job.customer.lastName}`,
      responseSummary: job.summary,
      triggeredBy: "tenant_job_creator",
      customerId: job.customerId,
      jobId: job.id
    }
  });

  if (job.scheduledFor && (await isAutomationPreferenceEnabled(input.tenantId, "booking_confirmation"))) {
    await enqueueAutomationJob({
      tenantId: input.tenantId,
      kind: "job.scheduled",
      payload: {
        jobId: job.id,
        customerId: job.customerId,
        summary: job.summary,
        scheduledFor: job.scheduledFor.toISOString()
      }
    });
  }

  return job;
}

export async function updateTenantJobSchedule(input: {
  tenantId: string;
  jobId: string;
  scheduledFor: Date;
}) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, tenantId: input.tenantId },
    include: {
      invoice: { select: { id: true } }
    }
  });

  if (!job) {
    throw new Error("Job not found for tenant");
  }

  if ((job.status === "invoiced" || job.status === "paid") && job.invoice) {
    throw new Error("Invoiced jobs cannot be rescheduled from FlowLab");
  }

  const nextStatus = job.status === "quoted" ? "scheduled" : job.status;
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      scheduledFor: input.scheduledFor,
      status: nextStatus
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: "Job scheduled",
      responseSummary: `${updated.summary} · ${input.scheduledFor.toISOString()}`,
      triggeredBy: "tenant_job_schedule_update",
      customerId: updated.customerId,
      jobId: updated.id
    }
  });

  if (await isAutomationPreferenceEnabled(input.tenantId, "booking_confirmation")) {
    await enqueueAutomationJob({
      tenantId: input.tenantId,
      kind: "job.scheduled",
      dedupeKey: null,
      payload: {
        jobId: updated.id,
        customerId: updated.customerId,
        summary: updated.summary,
        scheduledFor: updated.scheduledFor?.toISOString() ?? null
      }
    });
  }

  return updated;
}

export async function updateTenantJobActualHours(input: {
  tenantId: string;
  jobId: string;
  actualHours: number;
}) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, tenantId: input.tenantId }
  });

  if (!job) {
    throw new Error("Job not found for tenant");
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      actualHours: input.actualHours
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: "Job actual hours updated",
      responseSummary: `${updated.summary} · ${input.actualHours}h`,
      triggeredBy: "tenant_job_actuals_update",
      customerId: updated.customerId,
      jobId: updated.id
    }
  });

  return updated;
}

export async function updateTenantJobStatus(input: {
  tenantId: string;
  jobId: string;
  status: "quoted" | "scheduled" | "in_progress" | "complete";
}) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, tenantId: input.tenantId },
    include: {
      quote: { select: { id: true } },
      invoice: { select: { id: true } }
    }
  });

  if (!job) {
    throw new Error("Job not found for tenant");
  }

  if (input.status === "quoted" && job.quote == null) {
    throw new Error("Only quote-linked jobs can move to quoted");
  }

  if ((job.status === "invoiced" || job.status === "paid") && job.invoice) {
    throw new Error("Invoice-linked jobs must move through the invoice lifecycle");
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: { status: input.status }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: `Job status updated to ${input.status.replace(/_/g, " ")}`,
      responseSummary: updated.summary,
      triggeredBy: "tenant_job_status_update",
      customerId: updated.customerId,
      jobId: updated.id
    }
  });

  if (
    input.status === "scheduled" &&
    job.status !== "scheduled" &&
    (await isAutomationPreferenceEnabled(input.tenantId, "booking_confirmation"))
  ) {
    await enqueueAutomationJob({
      tenantId: input.tenantId,
      kind: "job.scheduled",
      payload: {
        jobId: updated.id,
        customerId: updated.customerId,
        summary: updated.summary,
        scheduledFor: updated.scheduledFor?.toISOString() ?? null
      }
    });
  }

  return updated;
}

export async function getTenantInvoiceRecord(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { customer: true, job: true }
  });

  if (!invoice) {
    return null;
  }

  const [invoiceCommunications, customerCommunications, otherCustomerJobs] = await Promise.all([
    prisma.communication.findMany({
      where: { tenantId, invoiceId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.communication.findMany({
      where: {
        tenantId,
        customerId: invoice.customerId,
        jobId: null,
        invoiceId: null
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.job.findMany({
      where: {
        tenantId,
        customerId: invoice.customerId,
        ...(invoice.jobId ? { id: { not: invoice.jobId } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return {
    invoice,
    invoiceCommunications,
    customerCommunications,
    otherCustomerJobs
  };
}

export async function syncTenantInvoiceFromXero(input: { tenantId: string; invoiceId: string }) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      tenantId: input.tenantId
    }
  });

  if (!invoice) {
    throw new Error("Invoice not found for tenant");
  }

  if (!invoice.xeroInvoiceId) {
    throw new Error("Invoice is not linked to Xero");
  }

  const integration = await prisma.tenantIntegration.findUnique({
    where: {
      tenantId_service: {
        tenantId: input.tenantId,
        service: PrismaIntegrationService.xero
      }
    }
  });

  if (!integration?.credentialsJson) {
    throw new Error("Xero integration is not configured");
  }

  const credentials = decryptJson(integration.credentialsJson) as unknown as XeroCredentials;
  const result = await getXeroInvoice(credentials, invoice.xeroInvoiceId);
  const xeroInvoice = result.data;

  if (result.credentials.accessToken !== credentials.accessToken) {
    await prisma.tenantIntegration.update({
      where: { tenantId_service: { tenantId: input.tenantId, service: PrismaIntegrationService.xero } },
      data: {
        credentialsJson: encryptJson(result.credentials as unknown as Record<string, string>)
      }
    });
  }

  let nextStatus = invoice.status;
  let nextPaidAt = invoice.paidAt;

  if (xeroInvoice.Status === "PAID") {
    nextStatus = "paid";
    nextPaidAt = invoice.paidAt ?? new Date();
  } else if (xeroInvoice.Status === "VOIDED" || xeroInvoice.Status === "DELETED") {
    nextStatus = "voided";
    nextPaidAt = null;
  } else {
    nextStatus = "sent";
    nextPaidAt = null;
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: nextStatus,
      paidAt: nextPaidAt,
      paymentLink: xeroInvoice.OnlineInvoiceUrl ?? invoice.paymentLink,
      xeroStatus: xeroInvoice.Status,
      xeroSyncedAt: new Date(),
      dueAt: xeroInvoice.DueDateString ? new Date(xeroInvoice.DueDateString) : invoice.dueAt
    }
  });

  if (invoice.jobId) {
    if (nextStatus === "paid") {
      await prisma.job.update({
        where: { id: invoice.jobId },
        data: { status: "paid" }
      }).catch(() => {});
    } else if (nextStatus === "voided") {
      await prisma.job.update({
        where: { id: invoice.jobId },
        data: { status: "complete" }
      }).catch(() => {});
    }
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "api_call",
      service: "xero",
      direction: "inbound",
      status: "success",
      requestSummary: `Synced Xero invoice ${updated.number}`,
      responseSummary: `Xero status ${xeroInvoice.Status}`,
      triggeredBy: "tenant_invoice_sync",
      customerId: updated.customerId,
      jobId: updated.jobId
    }
  });

  // Fire invoice.paid automation when transitioning into paid for the first time
  if (nextStatus === "paid" && invoice.status !== "paid") {
    await enqueueAutomationJob({
      tenantId: input.tenantId,
      kind: "invoice.paid",
      payload: {
        invoiceId: updated.id,
        invoiceNumber: updated.number,
        customerId: updated.customerId,
        amount: updated.amount,
        tenantId: input.tenantId
      }
    });
  }

  return updated;
}

export async function syncTenantOpenInvoicesFromXero(input: { tenantId: string }) {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: input.tenantId,
      xeroInvoiceId: { not: null },
      status: { notIn: ["paid", "voided"] }
    },
    select: { id: true }
  });

  let synced = 0;
  let failed = 0;

  for (const invoice of invoices) {
    try {
      await syncTenantInvoiceFromXero({
        tenantId: input.tenantId,
        invoiceId: invoice.id
      });
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    attempted: invoices.length,
    synced,
    failed
  };
}

/**
 * Find a FlowLab tenantId by matching the Xero org tenant ID stored in encrypted credentials.
 * Used by the Xero webhook handler to route incoming events to the right tenant.
 */
export async function findTenantIdByXeroTenantId(xeroTenantId: string): Promise<string | null> {
  const integrations = await prisma.tenantIntegration.findMany({
    where: { service: PrismaIntegrationService.xero },
    select: { tenantId: true, credentialsJson: true }
  });

  for (const integration of integrations) {
    if (!integration.credentialsJson) continue;
    try {
      const creds = decryptJson(integration.credentialsJson) as unknown as XeroCredentials;
      if (creds.xeroTenantId === xeroTenantId) {
        return integration.tenantId;
      }
    } catch {
      // skip malformed or unrelated credentials
    }
  }

  return null;
}

export async function getRetentionSnapshot(tenantId: string) {
  const [feedback, reminders, invoices, completedJobs] = await Promise.all([
    prisma.feedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.rebookReminder.findMany({
      where: { tenantId },
      orderBy: { dueAt: "asc" },
      take: 20
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["sent", "overdue"] }
      },
      include: { customer: true },
      orderBy: { dueAt: "asc" }
    }),
    prisma.job.findMany({
      where: {
        tenantId,
        status: "complete"
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const lowRatings = feedback.filter((entry) => entry.rating <= 3);
  const fiveStars = feedback.filter((entry) => entry.rating === 5);
  const overdueInvoices = invoices.filter((invoice) => invoice.dueAt && invoice.dueAt < new Date());

  return {
    feedback,
    reminders,
    invoices,
    completedJobs,
    stats: {
      lowRatings: lowRatings.length,
      fiveStars: fiveStars.length,
      overdueInvoices: overdueInvoices.length,
      pendingRebooks: reminders.filter((entry) => entry.status !== "sent").length
    }
  };
}

export async function getMobileJobSnapshot(tenantId: string) {
  return prisma.job.findMany({
    where: {
      tenantId,
      OR: [
        { status: "scheduled" },
        { status: "in_progress" }
      ]
    },
    include: {
      customer: true
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    take: 12
  });
}

export async function getTenantIntegrations(tenantId: string): Promise<TenantIntegration[]> {
  const records = await prisma.tenantIntegration.findMany({
    where: { tenantId },
    orderBy: { service: "asc" }
  });

  return records.map((integration) => ({
    id: integration.id,
    tenantId: integration.tenantId,
    service: integration.service,
    status: integration.status,
    lastTestedAt: integration.lastTestedAt?.toISOString() ?? null,
    lastTestResult: integration.lastTestResult as "success" | "failed" | null,
    lastErrorMessage: integration.lastErrorMessage,
    webhookUrl: integration.webhookUrl,
    oauthExpiresAt: integration.oauthExpiresAt?.toISOString() ?? null
  }));
}

export async function saveTenantIntegrationCredentials(input: {
  tenantId: string;
  service: IntegrationService;
  credentialsJson: string;
}) {
  return prisma.tenantIntegration.update({
    where: {
      tenantId_service: {
        tenantId: input.tenantId,
        service: input.service as PrismaIntegrationService
      }
    },
    data: {
      credentialsJson: input.credentialsJson,
      status: "connected",
      lastErrorMessage: null
    }
  });
}

export async function getTenantIntegrationRecord(tenantId: string, service: IntegrationService) {
  return prisma.tenantIntegration.findUnique({
    where: {
      tenantId_service: {
        tenantId,
        service: service as PrismaIntegrationService
      }
    }
  });
}

export async function getPlatformIntegrationRecord(service: IntegrationService) {
  return prisma.platformIntegration.findUnique({
    where: {
      service: service as PrismaIntegrationService
    }
  });
}

export async function getPlatformIntegrations() {
  return prisma.platformIntegration.findMany({
    orderBy: { service: "asc" }
  });
}

export async function getTenantEvents(tenantId: string): Promise<PlatformEventLogEntry[]> {
  const records = await prisma.platformEventLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return records.map((event) => ({
    id: event.id,
    createdAt: event.createdAt.toISOString(),
    tenantId: event.tenantId,
    jobId: event.jobId,
    customerId: event.customerId,
    eventType: event.eventType,
    service: event.service,
    direction: event.direction,
    status: event.status,
    httpStatusCode: event.httpStatusCode,
    requestSummary: event.requestSummary,
    responseSummary: event.responseSummary,
    durationMs: event.durationMs,
    errorMessage: event.errorMessage,
    triggeredBy: event.triggeredBy
  }));
}

export async function consumeRateLimit(input: {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
}) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - input.windowMs);
  const blockMs = input.blockMs ?? input.windowMs;
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { key: input.key }
  });

  if (!bucket) {
    await prisma.rateLimitBucket.create({
      data: {
        key: input.key,
        scope: input.scope,
        count: 1,
        windowStart: now
      }
    });

    return { allowed: true, remaining: Math.max(input.limit - 1, 0), retryAfterMs: 0 };
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(bucket.blockedUntil.getTime() - now.getTime(), 0)
    };
  }

  if (bucket.windowStart < windowStart) {
    await prisma.rateLimitBucket.update({
      where: { key: input.key },
      data: {
        scope: input.scope,
        count: 1,
        windowStart: now,
        blockedUntil: null
      }
    });

    return { allowed: true, remaining: Math.max(input.limit - 1, 0), retryAfterMs: 0 };
  }

  const nextCount = bucket.count + 1;
  const blockedUntil = nextCount > input.limit ? new Date(now.getTime() + blockMs) : null;

  await prisma.rateLimitBucket.update({
    where: { key: input.key },
    data: {
      scope: input.scope,
      count: nextCount,
      blockedUntil
    }
  });

  return {
    allowed: nextCount <= input.limit,
    remaining: Math.max(input.limit - Math.min(nextCount, input.limit), 0),
    retryAfterMs: blockedUntil ? blockMs : 0
  };
}

export async function createImpersonationNonce(input: { token: string; expiresAt: string }) {
  const nonce = crypto.randomBytes(32).toString("base64url");
  const nonceHash = hashImpersonationNonce(nonce);

  await prisma.platformEventLog.create({
    data: {
      eventType: "info",
      service: "auth",
      direction: "inbound",
      status: "pending",
      requestSummary: `${IMPERSONATION_NONCE_PREFIX}${nonceHash}`,
      responseSummary: encryptJson({ token: input.token, expiresAt: input.expiresAt }),
      triggeredBy: "superadmin_impersonate_nonce"
    }
  });

  return nonce;
}

export async function consumeImpersonationNonce(nonce: string) {
  const nonceHash = hashImpersonationNonce(nonce);
  const record = await prisma.platformEventLog.findFirst({
    where: {
      service: "auth",
      status: "pending",
      requestSummary: `${IMPERSONATION_NONCE_PREFIX}${nonceHash}`
    },
    select: {
      id: true,
      responseSummary: true
    }
  });

  if (!record?.responseSummary) {
    return null;
  }

  const payload = decryptJson(record.responseSummary);
  if (!payload.token || !payload.expiresAt || new Date(payload.expiresAt) <= new Date()) {
    await prisma.platformEventLog.update({
      where: { id: record.id },
      data: { status: "failed", responseSummary: null, errorMessage: "Impersonation nonce expired" }
    });
    return null;
  }

  const consumed = await prisma.platformEventLog.updateMany({
    where: { id: record.id, status: "pending" },
    data: { status: "success", responseSummary: null }
  });

  return consumed.count === 1 ? payload.token : null;
}

export async function createEnquiry(input: {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  suburb?: string;
  serviceRequest: string;
}) {
  // Plan limit check: jobs per month
  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { plan: true } });
  const features = getPlanFeatures((tenant?.plan ?? "starter") as TenantPlan);
  if (features.jobsPerMonth !== null) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const jobCount = await prisma.job.count({ where: { tenantId: input.tenantId, createdAt: { gte: startOfMonth } } });
    if (jobCount >= features.jobsPerMonth) {
      throw new Error(
        `Monthly job limit reached (${features.jobsPerMonth} jobs on your plan). Please upgrade to continue accepting enquiries.`
      );
    }
  }

  const email = normalizeEmail(input.email);
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      tenantId: input.tenantId,
      email
    }
  });

  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? existingCustomer.phone,
          address: input.address ?? existingCustomer.address,
          suburb: input.suburb ?? existingCustomer.suburb
        }
      })
    : await prisma.customer.create({
        data: {
          tenantId: input.tenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone: input.phone,
          address: input.address,
          suburb: input.suburb
        }
      });

  const enquiry = await prisma.enquiry.create({
    data: {
      tenantId: input.tenantId,
      customerId: customer.id,
      serviceRequest: input.serviceRequest,
      status: "new",
      source: "public_form"
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "inbound",
      status: "success",
      requestSummary: `Enquiry from ${input.firstName} ${input.lastName}`,
      responseSummary: existingCustomer ? "Existing customer enquiry captured" : "New customer enquiry captured",
      triggeredBy: "public_enquiry_form",
      customerId: customer.id
    }
  });

  if (await isAutomationPreferenceEnabled(input.tenantId, "enquiry_confirmation")) {
    await enqueueAutomationJob({
      tenantId: input.tenantId,
      kind: "enquiry.received",
      payload: {
        enquiryId: enquiry.id,
        customerId: customer.id,
        serviceRequest: input.serviceRequest
      }
    });
  }

  return { customer, enquiry };
}

function toToken(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

async function getTenantDocuSealConfig(tenantId: string) {
  const integration = await prisma.tenantIntegration.findUnique({
    where: {
      tenantId_service: {
        tenantId,
        service: PrismaIntegrationService.docuseal
      }
    }
  });

  const saved = integration?.credentialsJson ? decryptJson(integration.credentialsJson) : {};
  return {
    apiKey: saved.apiKey || process.env.DOCUSEAL_API_KEY || "",
    webhookSecretKey: saved.webhookSecretKey || process.env.DOCUSEAL_WEBHOOK_SECRET_KEY || "",
    webhookSecretValue: saved.webhookSecretValue || process.env.DOCUSEAL_WEBHOOK_SECRET_VALUE || ""
  };
}

function getAgreementTemplateRequirements(signerMode: string) {
  const requiredFields = [
    { name: "customer_signature", type: "signature", role: "Customer" },
    { name: "customer_signed_at", type: ["date", "datenow"], role: "Customer" }
  ];

  const requiredRoles = ["Customer"];

  if (signerMode === "customer_and_business") {
    requiredRoles.push("Business");
    requiredFields.push({ name: "business_signature", type: "signature", role: "Business" });
  }

  return { requiredRoles, requiredFields };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(amount);
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}

function compactText(input: string | null | undefined, fallback = "") {
  return (input || fallback).replace(/\s+/g, " ").trim();
}

function buildAgreementFieldValues(input: {
  quote: {
    title: string;
    description: string | null;
    amount: number;
    acceptedAt?: Date | null;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      address?: string | null;
      suburb?: string | null;
    };
  };
  tenant: {
    profile: {
      businessName: string;
    } | null;
  };
}) {
  const customerName = `${input.quote.customer.firstName} ${input.quote.customer.lastName}`.trim();
  const acceptedDate = formatShortDate(input.quote.acceptedAt ?? new Date());

  return {
    customer_name: customerName,
    customer_full_name: customerName,
    customer_address: compactText(input.quote.customer.address, "To be confirmed"),
    customer_suburb: compactText(input.quote.customer.suburb, "To be confirmed"),
    customer_phone: compactText(input.quote.customer.phone, "Not provided"),
    customer_email: compactText(input.quote.customer.email),
    agreement_date: acceptedDate || formatShortDate(new Date()),
    commencement_date: acceptedDate || "To be confirmed",
    service_summary: compactText(input.quote.title, "Quoted field service"),
    quote_scope: compactText(input.quote.description, "Quote scope confirmed in FlowLab."),
    quote_amount: `${formatCurrency(input.quote.amount)} per visit`,
    service_frequency: "As quoted in FlowLab",
    preferred_day: "To be confirmed",
    business_signer_name: compactText(input.tenant.profile?.businessName, "Business representative")
  };
}

export async function uploadTenantAgreementTemplate(input: {
  tenantId: string;
  templateName: string;
  fileName: string;
  mimeType?: string;
  fileBuffer: Buffer;
  signerMode?: "customer_only" | "customer_and_business";
}) {
  const [tenant, docuSealConfig] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      include: { profile: true }
    }),
    getTenantDocuSealConfig(input.tenantId)
  ]);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (!docuSealConfig.apiKey) {
    throw new Error("Connect DocuSeal before uploading agreement templates.");
  }

  const created = await createDocuSealTemplateFromFile({
    apiKey: docuSealConfig.apiKey,
    templateName: input.templateName,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileBuffer: input.fileBuffer
  });

  const signerMode = input.signerMode ?? "customer_only";
  const signerRoles = signerMode === "customer_and_business" ? ["Customer", "Business"] : ["Customer"];
  const template = await prisma.tenantAgreementTemplate.create({
    data: {
      tenantId: input.tenantId,
      name: input.templateName,
      sourceFileName: input.fileName,
      sourceMimeType: input.mimeType,
      signerMode,
      signerRoles,
      docusealTemplateId: created.id,
      docusealTemplateSlug: created.slug,
      isDefault: false,
      status: "draft",
      lastSyncedAt: new Date()
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "api_call",
      service: "docuseal",
      direction: "outbound",
      status: "success",
      requestSummary: `Uploaded agreement template ${input.templateName}`,
      responseSummary: `DocuSeal template ${created.id}`,
      triggeredBy: "tenant_agreement_template_upload"
    }
  });

  return template;
}

export async function createGeneratedTenantAgreementTemplate(input: {
  tenantId: string;
  templateName?: string;
  signerMode?: "customer_only" | "customer_and_business";
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    include: { profile: true }
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const signerMode = input.signerMode ?? "customer_only";
  const fileBuffer = await generateServiceAgreementTemplateDocx({
    businessName: tenant.profile?.businessName ?? tenant.slug,
    primaryColour: tenant.profile?.primaryColour,
    abn: tenant.profile?.abn,
    phone: tenant.profile?.phone,
    email: tenant.profile?.email || tenant.billingEmail,
    address: tenant.profile?.address,
    suburb: tenant.profile?.suburb,
    state: tenant.profile?.state,
    postcode: tenant.profile?.postcode,
    signerMode
  });

  const template = await uploadTenantAgreementTemplate({
    tenantId: input.tenantId,
    templateName: input.templateName?.trim() || "FlowLab Smart Service Agreement",
    fileName: "flowlab-smart-service-agreement.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileBuffer,
    signerMode
  });

  await validateTenantAgreementTemplate(input.tenantId, template.id);
  return prisma.tenantAgreementTemplate.findUniqueOrThrow({
    where: { id: template.id }
  });
}

export async function setDefaultTenantAgreementTemplate(tenantId: string, templateId: string) {
  const template = await prisma.tenantAgreementTemplate.findFirst({
    where: {
      id: templateId,
      tenantId
    }
  });

  if (!template) {
    throw new Error("Agreement template not found");
  }

  if (template.status !== "ready") {
    throw new Error("Template must be completed in the builder before it can be the default.");
  }

  await prisma.$transaction([
    prisma.tenantAgreementTemplate.updateMany({
      where: { tenantId },
      data: { isDefault: false }
    }),
    prisma.tenantAgreementTemplate.update({
      where: { id: templateId },
      data: { isDefault: true }
    })
  ]);

  await prisma.platformEventLog.create({
    data: {
      tenantId,
      eventType: "info",
      service: "docuseal",
      direction: "outbound",
      status: "success",
      requestSummary: `Set default agreement template to ${template.name}`,
      responseSummary: `Template ${template.docusealTemplateId} is now default`,
      triggeredBy: "tenant_agreement_template_default"
    }
  });
}

export async function getTenantAgreementTemplateBuilderState(input: {
  tenantId: string;
  templateId: string;
  integrationEmail?: string;
}) {
  const [template, docuSealConfig] = await Promise.all([
    prisma.tenantAgreementTemplate.findFirst({
      where: { id: input.templateId, tenantId: input.tenantId }
    }),
    getTenantDocuSealConfig(input.tenantId)
  ]);

  if (!template) {
    throw new Error("Agreement template not found");
  }

  if (!docuSealConfig.apiKey) {
    throw new Error("Connect DocuSeal before editing agreement templates.");
  }

  const remoteTemplate = await getDocuSealTemplate({
    apiKey: docuSealConfig.apiKey,
    templateId: template.docusealTemplateId
  });

  const adminEmail = remoteTemplate.author?.email || process.env.DOCUSEAL_ADMIN_EMAIL || process.env.BREVO_FROM_EMAIL || "";
  if (!adminEmail) {
    throw new Error("DocuSeal admin email could not be determined for embedded builder access.");
  }

  const builderToken = createDocuSealBuilderToken({
    apiKey: docuSealConfig.apiKey,
    adminEmail,
    integrationEmail: input.integrationEmail,
    templateId: template.docusealTemplateId,
    externalId: template.id
  });

  const requirements = getAgreementTemplateRequirements(template.signerMode);
  return {
    template,
    remoteTemplate,
    builderToken,
    requirements
  };
}

export async function validateTenantAgreementTemplate(tenantId: string, templateId: string) {
  const [template, docuSealConfig] = await Promise.all([
    prisma.tenantAgreementTemplate.findFirst({
      where: { id: templateId, tenantId }
    }),
    getTenantDocuSealConfig(tenantId)
  ]);

  if (!template) {
    throw new Error("Agreement template not found");
  }

  if (!docuSealConfig.apiKey) {
    throw new Error("Connect DocuSeal before validating agreement templates.");
  }

  const remoteTemplate = await getDocuSealTemplate({
    apiKey: docuSealConfig.apiKey,
    templateId: template.docusealTemplateId
  });

  const requirements = getAgreementTemplateRequirements(template.signerMode);
  const validation = validateDocuSealTemplateFields({
    fields: remoteTemplate.fields ?? [],
    submitters: remoteTemplate.submitters ?? [],
    requiredRoles: requirements.requiredRoles,
    requiredFields: requirements.requiredFields
  });

  const message = validation.ok
    ? null
    : [
        validation.missingRoles.length > 0 ? `Missing roles: ${validation.missingRoles.join(", ")}` : null,
        validation.missingFields.length > 0
          ? `Missing fields: ${validation.missingFields.map((field) => `${field.name} (${field.role})`).join(", ")}`
          : null
      ]
        .filter(Boolean)
        .join(" · ");

  const updated = await prisma.tenantAgreementTemplate.update({
    where: { id: template.id },
    data: {
      status: validation.ok ? "ready" : "draft",
      lastSyncedAt: new Date(),
      lastErrorMessage: message,
      isDefault: validation.ok ? template.isDefault : false
    }
  });

  if (validation.ok) {
    const existingDefault = await prisma.tenantAgreementTemplate.count({
      where: { tenantId, isDefault: true, status: "ready", id: { not: template.id } }
    });

    if (existingDefault === 0 && !updated.isDefault) {
      await prisma.tenantAgreementTemplate.update({
        where: { id: template.id },
        data: { isDefault: true }
      });
      updated.isDefault = true;
    }
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId,
      eventType: validation.ok ? "info" : "warning",
      service: "docuseal",
      direction: "outbound",
      status: validation.ok ? "success" : "failed",
      requestSummary: `Validated agreement template ${template.name}`,
      responseSummary: validation.ok ? "Template is ready for signing" : null,
      errorMessage: message,
      triggeredBy: "tenant_agreement_template_validate"
    }
  });

  return {
    template: updated,
    validation
  };
}

export async function createQuoteDraft(input: {
  tenantId: string;
  customerId: string;
  enquiryId?: string;
  serviceRequest: string;
  // area_based
  siteCondition?: "standard" | "overgrown" | "heavily_overgrown";
  areaSquareMetres?: number;
  // hourly
  estimatedHours?: number;
}) {
  const [customer, rate, tenant, serviceTemplates, enquiry] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: input.customerId, tenantId: input.tenantId }
    }),
    prisma.pricingRate.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { label: "asc" }
    }),
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      include: { profile: true }
    }),
    prisma.serviceRateTemplate.findMany({
      where: { tenantId: input.tenantId },
      take: 10
    }),
    input.enquiryId
      ? prisma.enquiry.findFirst({
          where: {
            id: input.enquiryId,
            tenantId: input.tenantId
          }
        })
      : Promise.resolve(null)
  ]);

  if (!customer) {
    throw new Error("Customer not found for tenant");
  }

  if (input.enquiryId) {
    if (!enquiry) {
      throw new Error("Enquiry not found for tenant");
    }

    if (enquiry.customerId !== input.customerId) {
      throw new Error("Enquiry does not belong to the selected customer");
    }

    if (enquiry.quoteId) {
      throw new Error("This enquiry is already linked to a quote");
    }
  }

  // Plan limit check: AI quotes per month
  const planFeatures = getPlanFeatures((tenant?.plan ?? "starter") as TenantPlan);
  if (planFeatures.aiQuotesPerMonth !== null) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const quoteCount = await prisma.quote.count({
      where: { tenantId: input.tenantId, createdAt: { gte: startOfMonth } }
    });
    if (quoteCount >= planFeatures.aiQuotesPerMonth) {
      throw new Error(
        `Monthly AI quote limit reached (${planFeatures.aiQuotesPerMonth} quotes on your plan). Please upgrade to continue generating quotes.`
      );
    }
  }

  const businessName = tenant?.profile?.businessName ?? "Service Provider";
  const businessType = tenant?.profile?.businessType ?? "other";
  const pricingModel = getPricingModel(businessType);

  // Attempt Claude AI quoting — fall back to formula if unavailable
  let title: string;
  let estimated: number;
  let description: string;
  let aiStatus: "success" | "failed" = "success";
  let aiDurationMs = 0;

  try {
    const aiResult = await generateAIQuote({
      tenantId: input.tenantId,
      businessName,
      businessType,
      pricingModel,
      enquiryText: input.serviceRequest,
      areaM2: input.areaSquareMetres,
      siteCondition: input.siteCondition,
      estimatedHours: input.estimatedHours,
      services: serviceTemplates.map((s) => ({
        name: s.serviceName,
        defaultPrice: s.defaultPrice ?? 0,
        defaultDuration: s.defaultDuration ?? 0
      })),
      pricingRate: rate ?? null
    });

    title = aiResult.title;
    estimated = aiResult.recommendedPrice;
    aiDurationMs = aiResult.durationMs;
    const breakdownText = aiResult.breakdown.map((b) => `${b.item}: $${b.price}`).join(" | ");
    description = `AI quote (${aiResult.confidence} confidence) — Est. ${aiResult.estimatedHours}h | ${breakdownText}${aiResult.notes ? ` | Note: ${aiResult.notes}` : ""}`;
  } catch {
    // Formula fallback — use the model-appropriate calculation
    aiStatus = "failed";
    const minimum = rate?.minimumCharge ?? 55;

    if (pricingModel === "area_based") {
      const condition = input.siteCondition ?? "standard";
      const area = input.areaSquareMetres ?? 80;
      const perSquare =
        condition === "heavily_overgrown"
          ? rate?.heavilyOvergrownRate ?? 4.2
          : condition === "overgrown"
            ? rate?.overgrownRate ?? 3.1
            : rate?.baseRatePerSquareM ?? 2.2;
      estimated = Math.max(minimum, Math.round(perSquare * area));
      title = input.serviceRequest.split(".")[0]?.slice(0, 60) || "Service quote";
      description = `Formula-based draft (AI unavailable): ${area}m² × $${perSquare}/m² = $${estimated}. Review before sending.`;
    } else if (pricingModel === "hourly") {
      const hours = input.estimatedHours ?? 2;
      const hourlyRate = rate?.hourlyRate ?? 75;
      estimated = Math.max(minimum, Math.round(hourlyRate * hours));
      title = input.serviceRequest.split(".")[0]?.slice(0, 60) || "Service quote";
      description = `Formula-based draft (AI unavailable): ${hours}h × $${hourlyRate}/hr = $${estimated}. Review before sending.`;
    } else {
      // flat_rate
      estimated = Math.max(minimum, rate?.calloutFee ?? minimum);
      title = input.serviceRequest.split(".")[0]?.slice(0, 60) || "Service quote";
      description = `Formula-based draft (AI unavailable): base charge $${estimated}. Review before sending.`;
    }
  }

  const quote = await prisma.quote.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      title,
      description,
      amount: estimated,
      status: "draft",
      accessToken: toToken("quote")
    },
    include: { customer: true }
  });

  if (enquiry) {
    await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: {
        quoteId: quote.id,
        status: "quoted",
        convertedAt: new Date()
      }
    });
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "api_call",
      service: "claude",
      direction: "outbound",
      status: aiStatus,
      durationMs: aiDurationMs,
      requestSummary: `AI quote for ${customer.firstName} ${customer.lastName} (${pricingModel})`,
      responseSummary: `${title} at $${estimated}`,
      triggeredBy: "tenant_quote_generator",
      customerId: customer.id
    }
  });

  return quote;
}

export async function updateTenantProfileSettings(input: {
  tenantId: string;
  businessName: string;
  tagline?: string;
  phone?: string;
  email?: string;
  primaryColour?: string;
  secondaryColour?: string;
  accentColour?: string;
  customDomain?: string;
  serviceAreaSuburbs?: string[];
  suburb?: string;
  postcode?: string;
  businessType?: "lawn_mowing" | "cleaning" | "pest_control" | "gardening" | "handyman" | "pool_service" | "other";
}) {
  const updated = await prisma.tenantProfile.update({
    where: { tenantId: input.tenantId },
    data: {
      businessName: input.businessName,
      tagline: input.tagline,
      phone: input.phone,
      email: input.email,
      primaryColour: input.primaryColour,
      secondaryColour: input.secondaryColour,
      accentColour: input.accentColour,
      customDomain: input.customDomain || null,
      customDomainVerified: false,
      serviceAreaSuburbs: input.serviceAreaSuburbs ?? [],
      suburb: input.suburb,
      postcode: input.postcode,
      businessType: input.businessType
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: "Updated tenant settings",
      responseSummary: updated.businessName,
      triggeredBy: "tenant_settings_form"
    }
  });

  return updated;
}

export async function saveTenantPricingSettings(input: {
  tenantId: string;
  pricingRate: {
    label: string;
    // area_based
    baseRatePerSquareM?: number | null;
    overgrownRate?: number | null;
    heavilyOvergrownRate?: number | null;
    // hourly
    hourlyRate?: number | null;
    // flat_rate
    calloutFee?: number | null;
    // common
    minimumCharge: number;
    gstEnabled: boolean;
  };
  serviceTemplates: Array<{
    serviceName: string;
    defaultPrice: number;
    defaultDuration: number;
  }>;
}) {
  // Upsert the pricing rate record
  const existing = await prisma.pricingRate.findFirst({ where: { tenantId: input.tenantId } });
  if (existing) {
    await prisma.pricingRate.update({
      where: { id: existing.id },
      data: { ...input.pricingRate }
    });
  } else {
    await prisma.pricingRate.create({
      data: { tenantId: input.tenantId, ...input.pricingRate }
    });
  }

  // Upsert service rate templates (delete and recreate for simplicity)
  await prisma.serviceRateTemplate.deleteMany({ where: { tenantId: input.tenantId } });
  if (input.serviceTemplates.length > 0) {
    await prisma.serviceRateTemplate.createMany({
      data: input.serviceTemplates.map((t) => ({ tenantId: input.tenantId, ...t }))
    });
  }

  return { ok: true };
}

export async function saveTenantScheduleSettings(input: {
  tenantId: string;
  workSchedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  personalCommitments: Array<{
    title: string;
    address?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  onlyIfEmpty?: boolean;
}) {
  if (input.onlyIfEmpty) {
    const [existingScheduleCount, existingCommitmentCount] = await Promise.all([
      prisma.workSchedule.count({ where: { tenantId: input.tenantId } }),
      prisma.personalCommitment.count({ where: { tenantId: input.tenantId } })
    ]);

    if (existingScheduleCount > 0 || existingCommitmentCount > 0) {
      return { ok: true, skipped: true as const };
    }
  }
  // Replace work schedule entirely
  await prisma.workSchedule.deleteMany({ where: { tenantId: input.tenantId } });
  if (input.workSchedule.length > 0) {
    await prisma.workSchedule.createMany({
      data: input.workSchedule.map((s) => ({ tenantId: input.tenantId, ...s }))
    });
  }

  // Replace personal commitments entirely
  await prisma.personalCommitment.deleteMany({ where: { tenantId: input.tenantId } });
  if (input.personalCommitments.length > 0) {
    await prisma.personalCommitment.createMany({
      data: input.personalCommitments.map((c) => ({ tenantId: input.tenantId, ...c }))
    });
  }

  return { ok: true };
}

export async function updateOnboardingProgress(userId: string, step: number, completed?: boolean) {
  return prisma.tenantUser.update({
    where: { id: userId },
    data: {
      onboardingStep: step,
      ...(completed != null ? { onboardingCompleted: completed } : {})
    }
  });
}

export async function acceptQuoteByToken(token: string) {
  const quote = await prisma.quote.findUnique({
    where: { accessToken: token },
    include: {
      customer: true
    }
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const existingJob = await prisma.job.findFirst({
    where: {
      tenantId: quote.tenantId,
      quote: {
        is: { id: quote.id }
      }
    }
  });
  const dedupeKey = `quote.accepted:${quote.id}`;
  const existingAutomationJob = await prisma.automationJob.findUnique({
    where: { dedupeKey }
  });
  const existingAgreement = await prisma.agreement.findFirst({
    where: {
      tenantId: quote.tenantId,
      quoteId: quote.id
    }
  });

  if (quote.status === "accepted" && existingJob && existingAgreement && existingAutomationJob) {
    return quote;
  }

  let quoteTransitioned = false;
  if (quote.status !== "accepted") {
    const accepted = await prisma.quote.updateMany({
      where: { accessToken: token, status: { not: "accepted" } },
      data: {
        status: "accepted",
        acceptedAt: new Date()
      }
    });
    quoteTransitioned = accepted.count > 0;
  }

  const updated = await prisma.quote.findUniqueOrThrow({
    where: { accessToken: token },
    include: {
      customer: true
    }
  });

  let createdJob = false;
  const job = existingJob ?? await prisma.job.create({
    data: {
      tenantId: quote.tenantId,
      customerId: quote.customerId,
      quoteId: quote.id,
      status: "quoted",
      address: quote.customer.address,
      suburb: quote.customer.suburb,
      summary: quote.title
    }
  }).then((record) => {
    createdJob = true;
    return record;
  }).catch(async (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const record = await prisma.job.findUnique({ where: { quoteId: quote.id } });
      if (record) return record;
    }
    throw error;
  });

  let createdAgreement = false;
  const agreementResult = existingAgreement
    ? { agreement: existingAgreement, created: false }
    : await createAgreementForQuoteClaim(quote.id);
  createdAgreement = agreementResult.created;
  const agreement = agreementResult.agreement;

  if (quoteTransitioned || createdJob || createdAgreement) {
    await prisma.platformEventLog.create({
      data: {
        tenantId: quote.tenantId,
        eventType: "webhook_received",
        service: "internal",
        direction: "inbound",
        status: "success",
        requestSummary: `Quote ${quote.title} accepted`,
        responseSummary: existingAgreement ? "Job and agreement already linked" : "Job created and agreement prepared",
        triggeredBy: "public_quote_acceptance",
        customerId: quote.customerId,
        jobId: job.id
      }
    });
  }

  await enqueueAutomationJob({
    tenantId: quote.tenantId,
    kind: "quote.accepted",
    dedupeKey,
    payload: {
      quoteId: quote.id,
      agreementId: agreement.id,
      customerId: quote.customerId,
      jobId: job.id,
      title: quote.title
    }
  });

  return updated;
}

export async function getInvoicePaymentContextByToken(token: string) {
  return prisma.invoice.findUnique({
    where: { accessToken: token },
    include: {
      tenant: {
        include: {
          profile: true
        }
      },
      customer: true
    }
  });
}


export async function createSimpleQuote(input: {
  tenantId: string;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  jobLocation: string;
  jobDescription: string;
  quoteAmount: number;
}) {
  const name = input.customerName.trim();
  const location = input.jobLocation.trim();
  const description = input.jobDescription.trim();
  const email = input.customerEmail?.trim().toLowerCase() ?? "";
  const mobile = input.customerMobile?.trim() ?? "";

  if (!name) throw new Error("Customer name is required");
  if (!location) throw new Error("Job suburb or location is required");
  if (!description) throw new Error("Job description is required");
  if (!Number.isFinite(input.quoteAmount) || input.quoteAmount <= 0) throw new Error("Quote amount must be more than 0");
  if (!email && !mobile) throw new Error("Add a mobile number or email");

  const [firstName, ...lastParts] = name.split(/\s+/);
  const lastName = lastParts.join(" ") || "Customer";

  const [emailMatches, phoneMatches] = await Promise.all([
    email
      ? prisma.customer.findMany({
          where: { tenantId: input.tenantId, email },
          select: { id: true },
          orderBy: { id: "asc" }
        })
      : Promise.resolve([]),
    mobile
      ? prisma.customer.findMany({
          where: { tenantId: input.tenantId, phone: mobile },
          select: { id: true },
          orderBy: { id: "asc" }
        })
      : Promise.resolve([])
  ]);

  const emailCustomerIds = emailMatches.map((customer) => customer.id);
  const phoneCustomerIds = phoneMatches.map((customer) => customer.id);
  const overlapCustomerId = emailCustomerIds.find((id) => phoneCustomerIds.includes(id)) ?? null;

  const matchedCustomerId = pickMatchedCustomerId(
    overlapCustomerId ?? emailCustomerIds[0] ?? null,
    overlapCustomerId ?? phoneCustomerIds[0] ?? null
  );

  const existingCustomer = matchedCustomerId
    ? await prisma.customer.findUnique({ where: { id: matchedCustomerId } })
    : null;

  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          phone: mobile || existingCustomer.phone,
          email: existingCustomer.email || email || existingCustomer.email
        }
      })
    : await prisma.customer.create({
        data: {
          tenantId: input.tenantId,
          firstName: firstName || "Customer",
          lastName,
          email: email || (() => { throw new Error("Add a customer email for new customers"); })(),
          phone: mobile || null,
          suburb: location
        }
      });

  const title = description.slice(0, 60);

  return prisma.quote.create({
    data: {
      tenantId: input.tenantId,
      customerId: customer.id,
      title: title || "Service quote",
      description,
      amount: Number(input.quoteAmount.toFixed(2)),
      status: "draft",
      accessToken: toToken("quote")
    },
    include: { customer: true }
  });
}

export async function createAgreementForQuote(quoteId: string) {
  const result = await createAgreementForQuoteClaim(quoteId);
  return result.agreement;
}

async function createAgreementForQuoteClaim(quoteId: string): Promise<{ agreement: Agreement; created: boolean }> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      tenant: {
        include: {
          profile: true,
          agreementTemplates: {
            where: { isDefault: true, status: "ready" },
            take: 1
          }
        }
      }
    }
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const accessToken = quote.accessToken.replace(/^quote-/, "agreement-");
  const businessName = quote.tenant.profile?.businessName ?? quote.tenant.slug;
  const signRequestBase = buildDocuSealRequest({
    businessName,
    customerName: `${quote.customer.firstName} ${quote.customer.lastName}`,
    customerEmail: quote.customer.email,
    agreementTitle: `${quote.title} agreement`,
    accessToken,
    tenantSlug: quote.tenant.slug,
    rootDomain: getCanonicalRootDomain()
  });
  const docuSealConfig = await getTenantDocuSealConfig(quote.tenantId);
  let externalRequestId = signRequestBase.externalRequestId;
  let signingUrl = signRequestBase.embeddedSignUrl;
  const defaultTemplate = quote.tenant.agreementTemplates[0] ?? null;
  const agreementFieldValues = buildAgreementFieldValues({
    quote,
    tenant: quote.tenant
  });
  let agreement: Agreement;

  try {
    agreement = await prisma.agreement.create({
      data: {
        tenantId: quote.tenantId,
        customerId: quote.customerId,
        quoteId: quote.id,
        title: `${quote.title} agreement`,
        status: "sent_for_signature",
        accessToken,
        externalId: externalRequestId,
        signingUrl,
        contractTemplateId: defaultTemplate?.id ?? null
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.agreement.findUnique({ where: { accessToken } });
      if (existing) {
        return { agreement: existing, created: false };
      }
    }
    throw error;
  }

  if (docuSealConfig.apiKey) {
    const callbackUrl = buildTenantUrl(quote.tenant.slug, "/api/webhooks/docuseal");
    const completedRedirectUrl = buildTenantUrl(quote.tenant.slug, `/sign/${accessToken}?completed=1`);
    const agreementText = [
      `${businessName} Service Agreement`,
      "",
      `Customer: ${quote.customer.firstName} ${quote.customer.lastName}`,
      `Service: ${quote.title}`,
      `Quoted Amount: AUD ${quote.amount.toFixed(2)}`,
      "",
      quote.description ?? "FlowLab-generated service agreement.",
      "",
      "By signing, the customer accepts the quoted scope, price, and scheduling coordination for the described service.",
      "Payment remains due according to the related invoice terms."
    ].join("\n");

    try {
      if (defaultTemplate) {
        const liveSubmission = await createDocuSealSubmissionFromTemplate({
          apiKey: docuSealConfig.apiKey,
          templateId: defaultTemplate.docusealTemplateId,
          accessToken,
          callbackUrl,
          completedRedirectUrl,
          submitters: [
            {
              name: `${quote.customer.firstName} ${quote.customer.lastName}`,
              email: quote.customer.email,
              role: "Customer",
              fields: [
                { name: "customer_name", defaultValue: agreementFieldValues.customer_name },
                { name: "customer_full_name", defaultValue: agreementFieldValues.customer_full_name },
                { name: "customer_address", defaultValue: agreementFieldValues.customer_address },
                { name: "customer_suburb", defaultValue: agreementFieldValues.customer_suburb },
                { name: "customer_phone", defaultValue: agreementFieldValues.customer_phone },
                { name: "customer_email", defaultValue: agreementFieldValues.customer_email },
                { name: "agreement_date", defaultValue: agreementFieldValues.agreement_date },
                { name: "commencement_date", defaultValue: agreementFieldValues.commencement_date },
                { name: "service_summary", defaultValue: agreementFieldValues.service_summary },
                { name: "quote_scope", defaultValue: agreementFieldValues.quote_scope },
                { name: "quote_amount", defaultValue: agreementFieldValues.quote_amount },
                { name: "service_frequency", defaultValue: agreementFieldValues.service_frequency },
                { name: "preferred_day", defaultValue: agreementFieldValues.preferred_day }
              ]
            },
            ...(defaultTemplate.signerMode === "customer_and_business" && (quote.tenant.profile?.email || quote.tenant.billingEmail)
              ? [
                  {
                    name: businessName,
                    email: quote.tenant.profile?.email || quote.tenant.billingEmail,
                    role: "Business",
                    fields: [{ name: "business_signer_name", defaultValue: agreementFieldValues.business_signer_name }]
                  }
                ]
              : [])
          ]
        });
        externalRequestId = liveSubmission.id || externalRequestId;
        signingUrl = liveSubmission.signingUrl || signingUrl;
      } else {
        const liveRequest = await sendDocuSealSignatureRequest({
          apiKey: docuSealConfig.apiKey,
          businessName,
          customerName: `${quote.customer.firstName} ${quote.customer.lastName}`,
          customerEmail: quote.customer.email,
          agreementTitle: `${quote.title} agreement`,
          agreementText,
          accessToken,
          callbackUrl
        });
        externalRequestId = liveRequest.externalRequestId;
      }
    } catch (error) {
      await prisma.platformEventLog.create({
        data: {
          tenantId: quote.tenantId,
          eventType: "error",
          service: "docuseal",
          direction: "outbound",
          status: "failed",
          requestSummary: `Failed to send agreement ${quote.title}`,
          errorMessage: error instanceof Error ? error.message : "Unknown DocuSeal error",
          triggeredBy: "agreement_dispatch"
        }
      });
    }
  }

  agreement = await prisma.agreement.update({
    where: { accessToken },
    data: {
      status: "sent_for_signature",
      externalId: externalRequestId,
      title: `${quote.title} agreement`,
      signingUrl,
      contractTemplateId: defaultTemplate?.id ?? null
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: quote.tenantId,
      eventType: "api_call",
      service: "docuseal",
      direction: "outbound",
      status: "success",
      requestSummary: `Prepared agreement ${agreement.title}`,
      responseSummary: `${defaultTemplate ? `Template ${defaultTemplate.name}` : "Legacy agreement"} · Signature request ${externalRequestId}`,
      triggeredBy: "agreement_dispatch",
      customerId: quote.customerId
    }
  });

  return { agreement, created: true };
}

export async function markAgreementSignedByToken(token: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { accessToken: token }
  });

  if (!agreement) {
    throw new Error("Agreement not found");
  }

  const dedupeKey = `agreement.signed:${agreement.id}`;
  const existingAutomationJob = await prisma.automationJob.findUnique({
    where: { dedupeKey }
  });

  if (agreement.status === "signed" && existingAutomationJob) {
    return agreement;
  }

  let agreementTransitioned = false;
  if (agreement.status !== "signed") {
    const signed = await prisma.agreement.updateMany({
      where: { accessToken: token, status: { not: "signed" } },
      data: {
        status: "signed",
        signedAt: new Date()
      }
    });
    agreementTransitioned = signed.count > 0;
  }

  const updated = await prisma.agreement.findUniqueOrThrow({
    where: { accessToken: token }
  });

  if (agreementTransitioned) {
    await prisma.platformEventLog.create({
      data: {
        tenantId: agreement.tenantId,
        eventType: "webhook_received",
        service: "docuseal",
        direction: "inbound",
        status: "success",
        requestSummary: `Agreement ${agreement.title} signed`,
        responseSummary: "Signature completion recorded",
        triggeredBy: "public_signature_completion",
        customerId: agreement.customerId
      }
    });
  }

  await enqueueAutomationJob({
    tenantId: agreement.tenantId,
    kind: "agreement.signed",
    dedupeKey,
    payload: {
      agreementId: agreement.id,
      quoteId: agreement.quoteId,
      customerId: agreement.customerId,
      title: agreement.title
    }
  });

  return updated;
}

export async function closeTenantEnquiry(input: {
  tenantId: string;
  enquiryId: string;
}) {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      id: input.enquiryId,
      tenantId: input.tenantId
    }
  });

  if (!enquiry) {
    throw new Error("Enquiry not found for tenant");
  }

  if (enquiry.quoteId) {
    throw new Error("Quoted enquiries cannot be closed from the queue");
  }

  const updated = await prisma.enquiry.update({
    where: { id: enquiry.id },
    data: {
      status: "closed"
    }
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: "Enquiry closed",
      responseSummary: updated.serviceRequest.slice(0, 160),
      triggeredBy: "tenant_enquiry_close",
      customerId: updated.customerId
    }
  });

  return updated;
}

export async function enqueueAutomationJob(input: {
  tenantId?: string | null;
  kind: string;
  payload: Record<string, unknown>;
  availableAt?: Date;
  dedupeKey?: string | null;
}) {
  if (input.dedupeKey) {
    const existing = await prisma.automationJob.findUnique({
      where: { dedupeKey: input.dedupeKey }
    });

    if (existing) {
      return existing;
    }
  }

  try {
    return await prisma.automationJob.create({
      data: {
        tenantId: input.tenantId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        kind: input.kind,
        payloadJson: JSON.stringify(input.payload),
        availableAt: input.availableAt ?? new Date()
      }
    });
  } catch (error) {
    if (
      input.dedupeKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.automationJob.findUnique({
        where: { dedupeKey: input.dedupeKey }
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}

export async function enqueueTrialExpiryJobs(now = new Date()) {
  const expired = await prisma.tenant.findMany({
    where: { status: "trial", trialEndsAt: { lt: now } },
    select: { id: true }
  });

  let enqueued = 0;
  for (const tenant of expired) {
    const dedupeKey = `billing.trial_expired:${tenant.id}`;
    const existing = await prisma.automationJob.findUnique({ where: { dedupeKey } });
    if (!existing) {
      await enqueueAutomationJob({
        tenantId: tenant.id,
        kind: "billing.trial_expired",
        dedupeKey,
        payload: { triggeredAt: now.toISOString() }
      });
      enqueued += 1;
    }
  }

  return { found: expired.length, enqueued };
}

export async function enqueueRecurringAutomationJobs(now = new Date()) {
  const [trialResult] = await Promise.all([enqueueTrialExpiryJobs(now)]);

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      profile: {
        select: {
          timezone: true
        }
      }
    }
  });

  let scheduled = 0;

  for (const tenant of tenants) {
    const preferences = await getTenantAutomationPreferencesMap(tenant.id);
    const timeZone = tenant.profile?.timezone || "Australia/Brisbane";
    const local = getLocalDateParts(now, timeZone);
    const minutes = local.hour * 60 + local.minute;
    const isoWeekKey = getIsoWeekKey(local);
    const jsDay = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
    const isoWeekday = jsDay === 0 ? 7 : jsDay;

    if (preferences.morning_digest && minutes >= 5 * 60 + 30) {
      const dedupeKey = `morning-digest:${tenant.id}:${local.dateKey}`;
      const existing = await prisma.automationJob.findUnique({
        where: { dedupeKey }
      });

      if (!existing) {
        await enqueueAutomationJob({
          tenantId: tenant.id,
          kind: "operator.morning_digest",
          dedupeKey,
          payload: {
            scheduledForLocalDate: local.dateKey,
            timeZone,
            queuedAt: now.toISOString()
          }
        });
        scheduled += 1;
      }
    }

    if (preferences.weekly_analysis && (isoWeekday > 1 || (isoWeekday === 1 && minutes >= 6 * 60))) {
      const dedupeKey = `weekly-analysis:${tenant.id}:${isoWeekKey}`;
      const existing = await prisma.automationJob.findUnique({
        where: { dedupeKey }
      });

      if (!existing) {
        await enqueueAutomationJob({
          tenantId: tenant.id,
          kind: "learning.weekly_analysis",
          dedupeKey,
          payload: {
            weekKey: isoWeekKey,
            timeZone,
            queuedAt: now.toISOString()
          }
        });
        scheduled += 1;
      }
    }

    // Day-before reminders: enqueue for each job scheduled tomorrow (local time)
    if (preferences.day_before_reminder && minutes >= 5 * 60 + 30) {
      const tomorrowLocal = getLocalDateParts(new Date(now.getTime() + 86400000), timeZone);
      const tomorrowDateKey = tomorrowLocal.dateKey;

      const upcomingJobs = await prisma.job.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ["scheduled", "in_progress"] },
          scheduledFor: {
            gte: now,
            lt: new Date(now.getTime() + 48 * 60 * 60 * 1000)
          }
        }
      });

      for (const job of upcomingJobs) {
        if (!job.scheduledFor) continue;
        const jobLocal = getLocalDateParts(job.scheduledFor, timeZone);
        if (jobLocal.dateKey !== tomorrowDateKey) continue;

        const dedupeKey = `day-before-reminder:${tenant.id}:${job.id}:${local.dateKey}`;
        const existing = await prisma.automationJob.findUnique({ where: { dedupeKey } });
        if (existing) continue;

        await enqueueAutomationJob({
          tenantId: tenant.id,
          kind: "job.day_before_reminder",
          dedupeKey,
          payload: {
            jobId: job.id,
            customerId: job.customerId,
            scheduledFor: job.scheduledFor.toISOString(),
            summary: job.summary,
            suburb: job.suburb ?? ""
          }
        });
        scheduled += 1;
      }
    }

    // Weather check: once per day alongside morning digest
    if (preferences.weekly_analysis && minutes >= 5 * 60 + 30) {
      const dedupeKey = `weather-check:${tenant.id}:${local.dateKey}`;
      const existing = await prisma.automationJob.findUnique({ where: { dedupeKey } });

      if (!existing) {
        await enqueueAutomationJob({
          tenantId: tenant.id,
          kind: "learning.weather_check",
          dedupeKey,
          payload: {
            localDate: local.dateKey,
            timeZone,
            queuedAt: now.toISOString()
          }
        });
        scheduled += 1;
      }
    }
  }

  return { tenants: tenants.length, scheduled, trialExpiriesEnqueued: trialResult.enqueued };
}

export async function syncMobileJobActions(input: {
  tenantId: string;
  actions: MobileJobAction[];
}) {
  const results: Array<{ jobId: string; type: MobileJobAction["type"]; ok: boolean }> = [];

  for (const action of input.actions) {
    const job = await prisma.job.findFirst({
      where: {
        id: action.jobId,
        tenantId: input.tenantId
      }
    });

    if (!job) {
      results.push({ jobId: action.jobId, type: action.type, ok: false });
      continue;
    }

    if (action.type === "status") {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: action.value as "quoted" | "scheduled" | "in_progress" | "complete" | "invoiced" | "paid"
        }
      });
    }

    if (action.type === "stop_timer") {
      const nextHours = Math.max(job.actualHours ?? 0, Number(action.value || "0"));
      await prisma.job.update({
        where: { id: job.id },
        data: {
          actualHours: Number.isFinite(nextHours) ? nextHours : job.actualHours
        }
      });
    }

    await prisma.platformEventLog.create({
      data: {
        tenantId: input.tenantId,
        eventType: "info",
        service: "mobile_job_app",
        direction: "inbound",
        status: "success",
        requestSummary: `Mobile sync ${action.type} for job ${job.id}`,
        responseSummary: action.value.slice(0, 120),
        triggeredBy: "mobile_sync",
        customerId: job.customerId,
        jobId: job.id
      }
    });

    results.push({ jobId: action.jobId, type: action.type, ok: true });
  }

  return results;
}

export async function enqueueSchedulerAnalysis(tenantId: string) {
  return enqueueAutomationJob({
    tenantId,
    kind: "schedule.recalculate",
    payload: {
      requestedAt: new Date().toISOString()
    }
  });
}

export async function enqueueMorningDigest(tenantId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);

  const [todayJobs, overdueInvoices, openEnquiries, pendingQuotes, recentFailed] = await Promise.all([
    prisma.job.findMany({
      where: {
        tenantId,
        scheduledFor: { gte: tomorrowStart, lt: tomorrowEnd }
      },
      include: { customer: true },
      orderBy: { scheduledFor: "asc" }
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: ["paid", "voided"] },
        dueAt: { lt: now }
      },
      include: { customer: true },
      orderBy: { dueAt: "asc" },
      take: 10
    }),
    prisma.enquiry.count({
      where: { tenantId, status: "new" }
    }),
    prisma.quote.count({
      where: { tenantId, status: "draft" }
    }),
    prisma.automationJob.count({
      where: {
        tenantId,
        status: { in: ["failed", "dead_letter"] },
        updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  return enqueueAutomationJob({
    tenantId,
    kind: "operator.morning_digest",
    payload: {
      requestedAt: now.toISOString(),
      tomorrowJobCount: String(todayJobs.length),
      tomorrowJobs: JSON.stringify(
        todayJobs.map((j) => ({
          summary: j.summary,
          suburb: j.suburb ?? j.customer.suburb ?? "TBD",
          time: j.scheduledFor
            ? new Date(j.scheduledFor).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
            : "TBD",
          customer: `${j.customer.firstName} ${j.customer.lastName}`
        }))
      ),
      overdueInvoiceCount: String(overdueInvoices.length),
      overdueInvoices: JSON.stringify(
        overdueInvoices.slice(0, 5).map((inv) => ({
          number: inv.number,
          amount: inv.amount,
          customer: `${inv.customer.firstName} ${inv.customer.lastName}`,
          daysOverdue: Math.floor((now.getTime() - (inv.dueAt?.getTime() ?? now.getTime())) / 86400000)
        }))
      ),
      openEnquiryCount: String(openEnquiries),
      pendingQuoteCount: String(pendingQuotes),
      recentFailedJobCount: String(recentFailed)
    }
  });
}

async function hasRecentOutboundCommunication(input: {
  tenantId: string;
  customerId: string;
  subject: string;
  withinHours: number;
}) {
  const since = new Date(Date.now() - input.withinHours * 60 * 60 * 1000);
  const existing = await prisma.communication.findFirst({
    where: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      direction: "outbound",
      subject: input.subject,
      createdAt: { gte: since },
      status: "sent"
    },
    select: { id: true }
  });

  return existing != null;
}

export async function enqueueRetentionRun(tenantId: string) {
  const preferences = await getTenantAutomationPreferencesMap(tenantId);
  const retention = await getRetentionSnapshot(tenantId);
  const jobs = [];

  if (preferences.invoice_reminders) {
    const now = new Date();
    for (const invoice of retention.invoices.filter((entry) => entry.dueAt && entry.dueAt < now)) {
      const daysOverdue = Math.floor((now.getTime() - invoice.dueAt!.getTime()) / 86400000);

      let kind: string;
      let subject: string;
      let withinHours: number;

      if (daysOverdue >= 14) {
        kind = "billing.payment_overdue_day14";
        subject = `Payment overdue day 14 · ${invoice.number}`;
        withinHours = 24 * 30;
      } else if (daysOverdue >= 7) {
        kind = "billing.payment_reminder_day7";
        subject = `Payment reminder day 7 · ${invoice.number}`;
        withinHours = 24 * 14;
      } else {
        kind = "billing.payment_reminder_day3";
        subject = `Payment reminder day 3 · ${invoice.number}`;
        withinHours = 24 * 7;
      }

      const alreadySent = await hasRecentOutboundCommunication({
        tenantId,
        customerId: invoice.customerId,
        subject,
        withinHours
      });

      if (alreadySent) continue;

      jobs.push(
        await enqueueAutomationJob({
          tenantId,
          kind,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            customerId: invoice.customerId,
            daysOverdue: String(daysOverdue)
          }
        })
      );
    }
  }

  for (const reminder of preferences.rebook_reminders ? retention.reminders.filter((entry) => entry.status !== "sent") : []) {
    const alreadySent = await hasRecentOutboundCommunication({
      tenantId,
      customerId: reminder.customerId,
      subject: "Rebook reminder",
      withinHours: 24 * 30
    });

    if (alreadySent) {
      continue;
    }

    jobs.push(
      await enqueueAutomationJob({
        tenantId,
        kind: "retention.rebook_reminder",
        payload: {
          reminderId: reminder.id,
          customerId: reminder.customerId
        }
      })
    );
  }

  for (const job of preferences.feedback_requests ? retention.completedJobs.slice(0, 5) : []) {
    const hasFeedback = retention.feedback.some((entry) => entry.jobId === job.id);
    const alreadySent = await hasRecentOutboundCommunication({
      tenantId,
      customerId: job.customerId,
      subject: `Feedback request · ${job.id}`,
      withinHours: 24 * 30
    });

    if (hasFeedback || alreadySent) {
      continue;
    }

    jobs.push(
      await enqueueAutomationJob({
        tenantId,
        kind: "retention.feedback_request",
        payload: {
          jobId: job.id,
          customerId: job.customerId
        }
      })
    );
  }

  for (const item of preferences.review_requests ? retention.feedback.filter((entry) => entry.rating === 5).slice(0, 5) : []) {
    const alreadySent = await hasRecentOutboundCommunication({
      tenantId,
      customerId: item.customerId,
      subject: `Review request · ${item.id}`,
      withinHours: 24 * 30
    });

    if (alreadySent) {
      continue;
    }

    jobs.push(
      await enqueueAutomationJob({
        tenantId,
        kind: "retention.review_request",
        payload: {
          feedbackId: item.id,
          customerId: item.customerId
        }
      })
    );
  }

  return jobs;
}

export async function claimPendingAutomationJobs(limit = 10) {
  const jobs = await prisma.automationJob.findMany({
    where: {
      status: "pending",
      availableAt: {
        lte: new Date()
      }
    },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  const claimed = [];

  for (const job of jobs) {
    const updated = await prisma.automationJob.updateMany({
      where: {
        id: job.id,
        status: "pending"
      },
      data: {
        status: "processing",
        attempts: {
          increment: 1
        }
      }
    });

    if (updated.count > 0) {
      claimed.push({
        ...job,
        status: "processing" as const,
        attempts: job.attempts + 1,
        payload: JSON.parse(job.payloadJson) as Record<string, unknown>
      });
    }
  }

  return claimed;
}

export function getAutomationRetryDelayMs(attempts: number) {
  const cappedAttempts = Math.max(1, attempts);
  return Math.min(1000 * 60 * 15, 15000 * 2 ** (cappedAttempts - 1));
}

export async function completeAutomationJob(id: string) {
  return prisma.automationJob.update({
    where: { id },
    data: {
      status: "completed",
      processedAt: new Date(),
      lastError: null,
      availableAt: new Date()
    }
  });
}

export async function failAutomationJob(id: string, error: string) {
  const job = await prisma.automationJob.findUnique({
    where: { id },
    select: {
      id: true,
      attempts: true
    }
  });

  if (!job) {
    throw new Error("Automation job not found");
  }

  const terminal = job.attempts >= AUTOMATION_MAX_ATTEMPTS;

  return prisma.automationJob.update({
    where: { id },
    data: terminal
      ? {
          status: "dead_letter",
          lastError: error,
          processedAt: new Date()
        }
      : {
          status: "pending",
          lastError: error,
          availableAt: new Date(Date.now() + getAutomationRetryDelayMs(job.attempts))
        }
  });
}

export async function getTenantAutomationHealth(tenantId: string) {
  const failureStatuses = ["failed", "dead_letter"] as const;
  const [failed, pending, processing, recentFailedJobs] = await Promise.all([
    prisma.automationJob.count({
      where: { tenantId, status: { in: [...failureStatuses] } }
    }),
    prisma.automationJob.count({
      where: { tenantId, status: "pending" }
    }),
    prisma.automationJob.count({
      where: { tenantId, status: "processing" }
    }),
    prisma.automationJob.findMany({
      where: { tenantId, status: { in: [...failureStatuses] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        kind: true,
        attempts: true,
        lastError: true,
        updatedAt: true
      }
    })
  ]);

  return {
    failed,
    pending,
    processing,
    recentFailedJobs
  };
}

export async function getTenantAutomationPreferencesMap(tenantId: string) {
  const rows = await prisma.automationPreference.findMany({
    where: { tenantId },
    select: { key: true, enabled: true }
  });

  return buildAutomationPreferenceMap(rows);
}

export async function isAutomationPreferenceEnabled(tenantId: string, key: AutomationPreferenceKey) {
  const preference = await prisma.automationPreference.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key
      }
    },
    select: { enabled: true }
  });

  return preference?.enabled ?? automationPreferenceDefaults[key];
}

export async function saveAutomationPreference(input: {
  tenantId: string;
  key: AutomationPreferenceKey;
  enabled: boolean;
}) {
  const preference = await prisma.automationPreference.upsert({
    where: {
      tenantId_key: {
        tenantId: input.tenantId,
        key: input.key
      }
    },
    create: {
      tenantId: input.tenantId,
      key: input.key,
      enabled: input.enabled
    },
    update: {
      enabled: input.enabled
    }
  });

  if (!input.enabled && automationPreferenceKinds[input.key].length > 0) {
    await prisma.automationJob.deleteMany({
      where: {
        tenantId: input.tenantId,
        status: "pending",
        kind: { in: automationPreferenceKinds[input.key] }
      }
    });
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: `Automation ${input.enabled ? "enabled" : "disabled"}: ${input.key.replace(/_/g, " ")}`,
      responseSummary: input.enabled ? "Preference saved" : "Preference saved and pending jobs cleared where applicable",
      triggeredBy: "tenant_automation_preference"
    }
  });

  return preference;
}

export async function applyAutomationRecipe(input: {
  tenantId: string;
  recipeKey: (typeof automationRecipeDescriptors)[number]["key"];
}) {
  const recipe = automationRecipeDescriptors.find((entry) => entry.key === input.recipeKey);

  if (!recipe) {
    throw new Error("Automation recipe not found");
  }

  await prisma.$transaction(
    recipe.enables.map((key) =>
      prisma.automationPreference.upsert({
        where: {
          tenantId_key: {
            tenantId: input.tenantId,
            key
          }
        },
        create: {
          tenantId: input.tenantId,
          key,
          enabled: true
        },
        update: {
          enabled: true
        }
      })
    )
  );

  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId,
      eventType: "info",
      service: "internal",
      direction: "outbound",
      status: "success",
      requestSummary: `Automation recipe applied: ${recipe.title}`,
      responseSummary: `${recipe.enables.length} automation preference${recipe.enables.length === 1 ? "" : "s"} enabled`,
      triggeredBy: "tenant_automation_recipe"
    }
  });

  return recipe;
}

export async function retryAutomationJob(input: { tenantId: string; jobId: string }) {
  return prisma.automationJob.updateMany({
    where: {
      id: input.jobId,
      tenantId: input.tenantId,
      status: { in: ["failed", "dead_letter"] }
    },
    data: {
      status: "pending",
      availableAt: new Date(),
      processedAt: null,
      lastError: null,
      attempts: 0
    }
  });
}

export async function findPlatformUser(email: string) {
  return prisma.platformUser.findUnique({ where: { email } });
}

export async function findTenantUser(email: string) {
  return prisma.tenantUser.findFirst({
    where: { email },
    include: {
      tenant: {
        include: { profile: true }
      }
    }
  });
}

function slugifyBusinessName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function createTenantWithOwner(input: {
  businessName: string;
  ownerName: string;
  email: string;
  authUserId: string;
  phone?: string;
  businessType: BusinessType;
  suburb?: string;
  plan: TenantPlan;
}) {
  const slugBase = slugifyBusinessName(input.businessName);
  const existing = await prisma.tenant.count({
    where: {
      slug: {
        startsWith: slugBase
      }
    }
  });

  const slug = existing > 0 ? `${slugBase}-${existing + 1}` : slugBase;
  const [firstName, ...rest] = input.ownerName.split(" ");

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      status: "trial",
      plan: input.plan,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingEmail: input.email,
      subscriptionStartDate: new Date(),
      monthlyFee: input.plan === "starter" ? 79 : input.plan === "professional" ? 149 : 249,
      profile: {
        create: {
          businessName: input.businessName,
          tagline: "Your business, automated.",
          primaryColour: "#0F172A",
          secondaryColour: "#1E293B",
          accentColour: "#3B82F6",
          phone: input.phone,
          email: input.email,
          suburb: input.suburb,
          serviceAreaSuburbs: input.suburb ? [input.suburb] : [],
          businessType: input.businessType,
          timezone: "Australia/Brisbane"
        }
      },
      users: {
        create: {
          authUserId: input.authUserId,
          email: input.email,
          role: "owner",
          firstName: firstName || "Owner",
          lastName: rest.join(" ") || input.businessName
        }
      }
    },
    include: {
      profile: true
    }
  });

  await prisma.tenantIntegration.createMany({
    data: ["twilio", "sendgrid", "stripe", "docuseal", "google_maps", "xero", "make_com", "claude"].map((service) => ({
      tenantId: tenant.id,
      service: service as PrismaIntegrationService,
      status: service === "claude" ? "connected" : "not_configured"
    }))
  });

  return tenant;
}

export async function updateIntegrationTestResult(input: {
  tenantId: string;
  service: IntegrationService;
  status: IntegrationStatus;
  ok: boolean;
  message: string;
}) {
  const isNotConfigured = input.status === "not_configured";
  return prisma.tenantIntegration.update({
    where: {
      tenantId_service: {
        tenantId: input.tenantId,
        service: input.service as PrismaIntegrationService
      }
    },
    data: {
      status: input.status as PrismaIntegrationStatus,
      lastTestedAt: new Date(),
      lastTestResult: isNotConfigured ? null : input.ok ? "success" : "failed",
      lastErrorMessage: isNotConfigured || input.ok ? null : input.message
    }
  });
}

export async function getQuoteByToken(token: string) {
  return prisma.quote.findUnique({
    where: { accessToken: token },
    include: {
      customer: true,
      tenant: { include: { profile: true } }
    }
  });
}

export async function getAgreementByToken(token: string) {
  return prisma.agreement.findUnique({
    where: { accessToken: token },
    include: {
      customer: true,
      tenant: { include: { profile: true } },
      contractTemplate: true
    }
  });
}

export async function getInvoiceByToken(token: string) {
  return prisma.invoice.findUnique({
    where: { accessToken: token },
    include: {
      customer: true,
      tenant: { include: { profile: true } }
    }
  });
}

export async function getFeedbackRequestByToken(token: string) {
  const payload = verifyCustomerToken(token);

  if (!payload || payload.resourceType !== "feedback" || new Date(payload.expiresAt) < new Date()) {
    return null;
  }

  const job = await prisma.job.findFirst({
    where: {
      id: payload.resourceId,
      tenantId: payload.tenantId
    },
    include: {
      customer: true,
      tenant: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!job) {
    return null;
  }

  return {
    token,
    expiresAt: payload.expiresAt,
    existingFeedback: await prisma.feedback.findFirst({
      where: {
        jobId: job.id
      }
    }),
    job,
    customer: job.customer,
    tenant: job.tenant
  };
}

async function updateCustomerRatingAverage(customerId: string) {
  const aggregate = await prisma.feedback.aggregate({
    where: { customerId },
    _avg: { rating: true }
  });

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ratingAverage: aggregate._avg.rating ?? null
    }
  });
}

export async function submitFeedbackByToken(token: string, input: { rating: number; comment?: string | null }) {
  const payload = verifyCustomerToken(token);

  if (!payload || payload.resourceType !== "feedback" || new Date(payload.expiresAt) < new Date()) {
    throw new Error("Feedback request expired");
  }

  const job = await prisma.job.findFirst({
    where: {
      id: payload.resourceId,
      tenantId: payload.tenantId
    },
    include: {
      customer: true,
      tenant: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!job) {
    throw new Error("Feedback request not found");
  }

  const existingFeedback = await prisma.feedback.findFirst({
    where: {
      jobId: job.id
    }
  });

  if (existingFeedback) {
    return {
      feedback: existingFeedback,
      reviewRequestQueued: false
    };
  }

  const feedback = await prisma.feedback.create({
    data: {
      tenantId: payload.tenantId,
      customerId: job.customerId,
      jobId: job.id,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      source: "public_form"
    }
  });

  await updateCustomerRatingAverage(job.customerId);

  await prisma.platformEventLog.create({
    data: {
      tenantId: payload.tenantId,
      eventType: "webhook_received",
      service: "internal",
      direction: "inbound",
      status: "success",
      requestSummary: `Feedback submitted by ${job.customer.firstName} ${job.customer.lastName}`,
      responseSummary: `${input.rating}/5 rating captured`,
      triggeredBy: "public_feedback_form",
      customerId: job.customerId,
      jobId: job.id
    }
  });

  if (input.rating === 5 && (await isAutomationPreferenceEnabled(payload.tenantId, "review_requests"))) {
    await enqueueAutomationJob({
      tenantId: payload.tenantId,
      kind: "retention.review_request",
      payload: {
        feedbackId: feedback.id,
        customerId: job.customerId
      }
    });
  }

  return {
    feedback,
    reviewRequestQueued: input.rating === 5
  };
}

export interface RateSuggestion {
  field: string;
  label: string;
  current: number;
  suggested: number;
  reason: string;
}

/** Save AI-generated rate suggestions as a platform event for operator review. */
export async function saveRateSuggestions(tenantId: string, suggestions: RateSuggestion[]) {
  return prisma.platformEventLog.create({
    data: {
      tenantId,
      eventType: "api_call",
      service: "claude",
      direction: "outbound",
      status: "pending", // 'pending' = awaiting operator review
      requestSummary: "AI time-estimate learning analysis complete",
      responseSummary: JSON.stringify(suggestions),
      triggeredBy: "learning_weekly_analysis"
    }
  });
}

/** Fetch the most recent pending rate suggestions for a tenant (awaiting review). */
export async function getPendingRateSuggestions(tenantId: string): Promise<RateSuggestion[]> {
  const event = await prisma.platformEventLog.findFirst({
    where: {
      tenantId,
      triggeredBy: "learning_weekly_analysis",
      status: "pending"
    },
    orderBy: { createdAt: "desc" }
  });

  if (!event?.responseSummary) return [];
  try {
    return JSON.parse(event.responseSummary) as RateSuggestion[];
  } catch {
    return [];
  }
}

/** Mark rate suggestions as dismissed or applied. */
export async function resolveRateSuggestions(tenantId: string, action: "applied" | "dismissed") {
  await prisma.platformEventLog.updateMany({
    where: { tenantId, triggeredBy: "learning_weekly_analysis", status: "pending" },
    data: { status: action === "applied" ? "success" : "failed" }
  });
}

export async function ensureDemoSeed() {
  const existing = await prisma.tenant.findUnique({ where: { slug: "lawnorder" } });

  // Passwords are now managed by Supabase Auth — seed only creates DB records.
  // Run `npm run db:seed` then log in once to trigger the dual-mode lazy migration,
  // or create Supabase Auth users manually via the dashboard.

  const tenant =
    existing ??
    (await prisma.tenant.create({
      data: {
        slug: "lawnorder",
        status: "trial",
        plan: "professional",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        billingEmail: "owner@lawnorder.com.au",
        subscriptionStartDate: new Date(),
        monthlyFee: 149,
        notes: "Demo reference tenant"
      }
    }));

  await prisma.platformUser.upsert({
    where: {
      email: "admin@flowlabsolutions.com.au"
    },
    update: {
      role: "superadmin"
    },
    create: {
      email: "admin@flowlabsolutions.com.au",
      role: "superadmin"
    }
  });

  await prisma.tenantProfile.upsert({
    where: { tenantId: tenant.id },
    update: {
      businessName: "Lawn & Order Mowing",
      tagline: "Professional lawns. Zero hassle.",
      primaryColour: "#2D5016",
      secondaryColour: "#1F2937",
      accentColour: "#84CC16",
      businessType: "lawn_mowing",
      suburb: "Tannum Sands",
      state: "QLD",
      phone: "+61 499 000 111",
      email: "owner@lawnorder.com.au",
      serviceAreaSuburbs: ["Tannum Sands", "Boyne Island", "Gladstone"],
      timezone: "Australia/Brisbane"
    },
    create: {
      tenantId: tenant.id,
      businessName: "Lawn & Order Mowing",
      tagline: "Professional lawns. Zero hassle.",
      primaryColour: "#2D5016",
      secondaryColour: "#1F2937",
      accentColour: "#84CC16",
      businessType: "lawn_mowing",
      suburb: "Tannum Sands",
      state: "QLD",
      phone: "+61 499 000 111",
      email: "owner@lawnorder.com.au",
      serviceAreaSuburbs: ["Tannum Sands", "Boyne Island", "Gladstone"],
      timezone: "Australia/Brisbane"
    }
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "owner@lawnorder.com.au"
      }
    },
    update: {
      role: "owner",
      firstName: "Jordan",
      lastName: "Webb"
    },
    create: {
      tenantId: tenant.id,
      email: "owner@lawnorder.com.au",
      role: "owner",
      firstName: "Jordan",
      lastName: "Webb"
    }
  });

  if ((await prisma.service.count({ where: { tenantId: tenant.id } })) === 0) {
    await prisma.service.createMany({
      data: [
        { tenantId: tenant.id, name: "Mow & edge", defaultPrice: 75, defaultDuration: 60 },
        { tenantId: tenant.id, name: "Garden beds", defaultPrice: 55, defaultDuration: 45 },
        { tenantId: tenant.id, name: "Hedge trim", defaultPrice: 85, defaultDuration: 75 },
        { tenantId: tenant.id, name: "Gutter clean", defaultPrice: 120, defaultDuration: 90 },
        { tenantId: tenant.id, name: "Palm removal", defaultPrice: 180, defaultDuration: 120 }
      ]
    });
  }

  if ((await prisma.pricingRate.count({ where: { tenantId: tenant.id } })) === 0) {
    await prisma.pricingRate.create({
      data: {
        tenantId: tenant.id,
        label: "Default",
        baseRatePerSquareM: 2.2,
        overgrownRate: 3.1,
        heavilyOvergrownRate: 4.2,
        minimumCharge: 55,
        gstEnabled: true,
        scheduleBufferPct: 12
      }
    });
  }

  if ((await prisma.workSchedule.count({ where: { tenantId: tenant.id } })) === 0) {
    await prisma.workSchedule.createMany({
      data: [
        { tenantId: tenant.id, dayOfWeek: 1, startTime: "07:00", endTime: "16:00" },
        { tenantId: tenant.id, dayOfWeek: 2, startTime: "07:00", endTime: "16:00" },
        { tenantId: tenant.id, dayOfWeek: 3, startTime: "07:00", endTime: "16:00" },
        { tenantId: tenant.id, dayOfWeek: 4, startTime: "07:00", endTime: "16:00" },
        { tenantId: tenant.id, dayOfWeek: 5, startTime: "07:00", endTime: "14:00" }
      ]
    });
  }

  if ((await prisma.personalCommitment.count({ where: { tenantId: tenant.id } })) === 0) {
    await prisma.personalCommitment.create({
      data: {
        tenantId: tenant.id,
        title: "School pickup",
        address: "Tannum Sands State School",
        notes: "Build routes around this pickup window.",
        dayOfWeek: 3,
        startTime: "14:30",
        endTime: "15:30"
      }
    });
  }

  if ((await prisma.timeOff.count({ where: { tenantId: tenant.id } })) === 0) {
    await prisma.timeOff.create({
      data: {
        tenantId: tenant.id,
        title: "Family long weekend",
        startAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      }
    });
  }

  const demoCustomers = [
    { firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com", phone: "+61 400 111 111", suburb: "Tannum Sands", address: "12 Beach Ave" },
    { firstName: "Michael", lastName: "Tran", email: "michael@example.com", phone: "+61 400 222 222", suburb: "Boyne Island", address: "4 Willow St" },
    { firstName: "Leah", lastName: "Smith", email: "leah@example.com", phone: "+61 400 333 333", suburb: "Gladstone", address: "8 Harbour Rd" },
    { firstName: "Owen", lastName: "Frost", email: "owen@example.com", phone: "+61 400 444 444", suburb: "Boyne Island", address: "19 Marina Ct" },
    { firstName: "Priya", lastName: "Shah", email: "priya@example.com", phone: "+61 400 555 555", suburb: "Tannum Sands", address: "31 Ocean Dr" }
  ] as const;

  const customers = await Promise.all(
    demoCustomers.map(async (customer) => {
      const existingCustomer = await prisma.customer.findFirst({
        where: { tenantId: tenant.id, email: customer.email }
      });

      if (existingCustomer) {
        return existingCustomer;
      }

      return prisma.customer.create({
        data: {
          tenantId: tenant.id,
          ...customer
        }
      });
    })
  );

  await Promise.all(
    customers.map(async (customer, index) => {
      const summary = `Recurring lawn service for ${customer.firstName}`;
      const existingJob = await prisma.job.findFirst({
        where: { tenantId: tenant.id, customerId: customer.id, summary }
      });

      if (existingJob) {
        return existingJob;
      }

      return prisma.job.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          status: index % 2 === 0 ? "scheduled" : "complete",
          summary,
          address: customer.address,
          suburb: customer.suburb,
          scheduledFor: new Date(Date.now() + index * 24 * 60 * 60 * 1000),
          estimatedHours: 1 + index * 0.15,
          actualHours: index % 2 === 0 ? null : 1 + index * 0.2,
          weatherRisk: index === 3
        }
      });
    })
  );

  await Promise.all(
    customers.slice(0, 3).map(async (customer, index) => {
      const accessToken = `quote-${tenant.slug}-demo-token-${index + 1}`;
      const existingQuote = await prisma.quote.findUnique({
        where: { accessToken }
      });

      if (existingQuote) {
        return existingQuote;
      }

      return prisma.quote.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          title: `Seasonal lawn package ${index + 1}`,
          description: "AI-assisted quote draft pending operator approval.",
          amount: 90 + index * 25,
          status: index === 0 ? "accepted" : "draft",
          accessToken
        }
      });
    })
  );

  await Promise.all(
    customers.slice(0, 3).map(async (customer, index) => {
      const number = `LNO-10${index + 1}`;
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          tenantId_number: {
            tenantId: tenant.id,
            number
          }
        }
      });

      if (existingInvoice) {
        return existingInvoice;
      }

      return prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          number,
          amount: 75 + index * 30,
          status: index === 0 ? "paid" : "sent",
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paidAt: index === 0 ? new Date() : null,
          accessToken: `invoice-${tenant.slug}-demo-token-${index + 1}`
        }
      });
    })
  );

  const existingReminderSms = await prisma.communication.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[0]!.id,
      subject: "Job reminder"
    }
  });

  if (!existingReminderSms) {
    await prisma.communication.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[0]!.id,
        channel: "sms",
        direction: "outbound",
        subject: "Job reminder",
        body: "Reminder: your lawn service is booked for tomorrow morning.",
        status: "sent"
      }
    });
  }

  const existingInvoiceEmail = await prisma.communication.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[1]!.id,
      subject: "Invoice issued"
    }
  });

  if (!existingInvoiceEmail) {
    await prisma.communication.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[1]!.id,
        channel: "email",
        direction: "outbound",
        subject: "Invoice issued",
        body: "Your invoice is ready for payment.",
        status: "delivered"
      }
    });
  }

  const existingPositiveFeedback = await prisma.feedback.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[0]!.id,
      comment: "Always reliable and tidy."
    }
  });

  if (!existingPositiveFeedback) {
    await prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[0]!.id,
        rating: 5,
        comment: "Always reliable and tidy.",
        source: "sms"
      }
    });
  }

  const existingTimingFeedback = await prisma.feedback.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[2]!.id,
      comment: "Good job, but arrived later than expected."
    }
  });

  if (!existingTimingFeedback) {
    await prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[2]!.id,
        rating: 3,
        comment: "Good job, but arrived later than expected.",
        source: "email"
      }
    });
  }

  const existingFirstReminder = await prisma.rebookReminder.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[0]!.id,
      status: "pending"
    }
  });

  if (!existingFirstReminder) {
    await prisma.rebookReminder.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[0]!.id,
        dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "pending"
      }
    });
  }

  const existingSecondReminder = await prisma.rebookReminder.findFirst({
    where: {
      tenantId: tenant.id,
      customerId: customers[3]!.id,
      status: "pending"
    }
  });

  if (!existingSecondReminder) {
    await prisma.rebookReminder.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[3]!.id,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "pending"
      }
    });
  }

  await prisma.tenantIntegration.createMany({
    data: ["twilio", "sendgrid", "stripe", "docuseal", "google_maps", "xero", "make_com", "claude"].map((service) => ({
      tenantId: tenant.id,
      service: service as PrismaIntegrationService,
      status: service === "claude" ? "connected" : "not_configured"
    })),
    skipDuplicates: true
  });

  if ((await prisma.platformEventLog.count({ where: { tenantId: tenant.id, triggeredBy: "seed" } })) === 0) {
    await prisma.platformEventLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          eventType: "info",
          service: "internal",
          direction: "outbound",
          status: "success",
          requestSummary: "Tenant seeded",
          responseSummary: "Demo tenant ready",
          triggeredBy: "seed"
        },
        {
          tenantId: tenant.id,
          eventType: "warning",
          service: "make",
          direction: "outbound",
          status: "failed",
          requestSummary: "Webhook test",
          responseSummary: "No webhook configured",
          errorMessage: "Missing webhook URL",
          triggeredBy: "seed"
        }
      ]
    });
  }

  return tenant;
}

export async function getAdminHealthSummary() {
  const [failedJobsByTenant, expiringIntegrations] = await Promise.all([
    prisma.automationJob.groupBy({
      by: ["tenantId"],
      where: { status: { in: ["failed", "dead_letter"] } },
      _count: { id: true }
    }),
    prisma.platformIntegration.findMany({
      where: {
        oauthExpiresAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: { service: true, oauthExpiresAt: true }
    })
  ]);

  const totalFailedJobs = failedJobsByTenant.reduce((sum, row) => sum + row._count.id, 0);

  return {
    totalFailedJobs,
    tenantsWithFailures: failedJobsByTenant.length,
    expiringIntegrations
  };
}

export async function logWebhookFailure(input: {
  tenantId?: string | null;
  service: string;
  errorMessage: string;
  requestSummary?: string;
}) {
  await prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      eventType: "webhook_received",
      service: input.service as PrismaIntegrationService,
      direction: "inbound",
      status: "failed",
      requestSummary: input.requestSummary ?? `${input.service} webhook failed`,
      errorMessage: input.errorMessage,
      triggeredBy: `${input.service}_webhook`
    }
  });
}
