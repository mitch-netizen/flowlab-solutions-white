import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { suggestServiceTemplates } from "@flowlab/integrations/claude";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST() {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const [recentJobs, existingTemplates, profile] = await Promise.all([
    prisma.job.findMany({
      where: { tenantId },
      select: { summary: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.serviceRateTemplate.findMany({
      where: { tenantId },
      select: { serviceName: true }
    }),
    prisma.tenantProfile.findFirst({
      where: { tenantId },
      select: { businessName: true, businessType: true }
    })
  ]);

  const suggestions = await suggestServiceTemplates({
    businessName: profile?.businessName ?? "Your business",
    businessType: profile?.businessType ?? "general_trades",
    recentJobSummaries: recentJobs.map((j: { summary: string }) => j.summary),
    existingTemplateNames: existingTemplates.map((t: { serviceName: string }) => t.serviceName)
  });

  return NextResponse.json({ suggestions });
}
