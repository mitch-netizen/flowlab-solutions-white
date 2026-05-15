import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@flowlab/db";

export async function GET(request: NextRequest) {
  try {
    // Get the tenant from the query parameters (if provided)
    const tenantId = request.nextUrl.searchParams.get("tenantId");
    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30");

    // Build the query filter
    const filter = {
      triggeredBy: "email_cta_click",
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      },
      ...(tenantId ? { tenantId } : {})
    };

    // Get all click events
    const events = await prisma.platformEventLog.findMany({
      where: filter,
      select: {
        tenantId: true,
        requestSummary: true,
        responseSummary: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Parse click data from requestSummary (format: "CTA clicked: <buttonLabel>")
    const clicksByButton: Record<string, number> = {};
    const clicksByAutomationType: Record<string, number> = {};
    let totalClicks = 0;

    for (const event of events) {
      totalClicks++;

      // Extract button label from requestSummary
      const buttonMatch = event.requestSummary?.match(/CTA clicked: (.+)$/);
      if (buttonMatch) {
        const buttonLabel = buttonMatch[1];
        clicksByButton[buttonLabel] = (clicksByButton[buttonLabel] ?? 0) + 1;
      }

      // Extract automation type from responseSummary (format: "Email link tracking from <kind>")
      const automationMatch = event.responseSummary?.match(/Email link tracking from (.+)$/);
      if (automationMatch) {
        const automationType = automationMatch[1];
        clicksByAutomationType[automationType] = (clicksByAutomationType[automationType] ?? 0) + 1;
      }
    }

    // Sort and prepare response
    const topButtons = Object.entries(clicksByButton)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));

    const topAutomations = Object.entries(clicksByAutomationType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([kind, count]) => ({ kind, count }));

    return NextResponse.json({
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      totalClicks,
      topButtons,
      topAutomations,
      buttonBreakdown: clicksByButton,
      automationTypeBreakdown: clicksByAutomationType
    });
  } catch (err) {
    console.error("Failed to fetch click metrics:", err);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
