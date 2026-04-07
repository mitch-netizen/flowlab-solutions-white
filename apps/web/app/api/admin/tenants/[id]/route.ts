import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../../lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
          durationMs: true
        }
      },
      _count: {
        select: { jobs: true, invoices: true, customers: true }
      }
    }
  });

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    businessName?: string;
    plan?: string;
    status?: string;
    monthlyFee?: number;
    notes?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.plan) updates.plan = body.plan;
  if (body.status) updates.status = body.status;
  if (body.monthlyFee != null) updates.monthlyFee = body.monthlyFee;
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
