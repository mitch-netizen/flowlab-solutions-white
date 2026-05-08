import { NextResponse } from "next/server";

import { adminTenantUpdateSchema } from "@flowlab/contracts/server";
import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      plan: true,
      monthlyFee: true,
      trialEndsAt: true,
      billingEmail: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
      stripePriceId: true,
      subscriptionStartDate: true,
      createdAt: true,
      notes: true,
      profile: {
        select: {
          businessName: true,
          businessType: true,
          phone: true,
          email: true,
          suburb: true,
          state: true,
          abn: true,
          primaryColour: true
        }
      },
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authUserId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          onboardingCompleted: true,
          onboardingStep: true,
          lastLoginAt: true
        }
      },
      integrations: {
        orderBy: { service: "asc" },
        select: {
          id: true,
          service: true,
          status: true,
          lastTestedAt: true,
          lastTestResult: true,
          lastErrorMessage: true
        }
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          eventType: true,
          service: true,
          direction: true,
          status: true,
          requestSummary: true,
          errorMessage: true,
          durationMs: true,
          triggeredBy: true
        }
      },
      enquiries: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          serviceRequest: true,
          status: true,
          source: true,
          convertedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              suburb: true
            }
          },
          quote: {
            select: {
              id: true,
              title: true,
              amount: true,
              status: true
            }
          }
        }
      },
      _count: {
        select: { jobs: true, invoices: true, customers: true, enquiries: true }
      }
    }
  });

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = adminTenantUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const updates: Record<string, unknown> = {};
  if (body.plan) updates.plan = body.plan;
  if (body.status) updates.status = body.status;
  if (body.monthlyFee != null) updates.monthlyFee = body.monthlyFee;
  if (body.billingEmail) updates.billingEmail = body.billingEmail;
  if (body.stripeCustomerId != null) updates.stripeCustomerId = body.stripeCustomerId || null;
  if (body.notes != null) updates.notes = body.notes;

  if (Object.keys(updates).length > 0) {
    await prisma.tenant.update({ where: { id }, data: updates });
  }

  if (body.businessName) {
    await prisma.tenantProfile.update({
      where: { tenantId: id },
      data: { businessName: body.businessName }
    });
  }

  await prisma.platformEventLog.create({
    data: {
      tenantId: id,
      eventType: "info",
      service: "worker",
      direction: "inbound",
      status: "success",
      requestSummary: "Tenant settings updated by superadmin",
      responseSummary: Object.keys(body).join(", "),
      triggeredBy: `superadmin_${session.email}`
    }
  });

  return NextResponse.json({ ok: true });
}
