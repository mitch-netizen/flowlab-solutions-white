import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destinationUrl = searchParams.get("dest");
    const jobId = searchParams.get("job");
    const buttonLabel = searchParams.get("btn");

    if (!destinationUrl) {
      return new NextResponse(null, { status: 400 });
    }

    // Log the click event if we have job info
    if (jobId && buttonLabel) {
      try {
        // Get the job to find tenantId for logging
        const job = await prisma.automationJob.findUnique({
          where: { id: jobId },
          select: { tenantId: true, kind: true }
        });

        if (job?.tenantId) {
          await logPlatformEvent({
            tenantId: job.tenantId,
            eventType: "info",
            service: "automation_email",
            direction: "inbound",
            status: "success",
            requestSummary: `CTA clicked: ${buttonLabel}`,
            responseSummary: `Email link tracking from ${job.kind}`,
            triggeredBy: "email_cta_click"
          });
        }
      } catch (err) {
        // Log tracking errors but don't block the redirect
        console.error("Failed to log CTA click:", err);
      }
    }

    // Redirect to the destination URL
    redirect(destinationUrl);
  } catch (err) {
    console.error("Click tracking error:", err);
    // Fallback: return a 400 error if something goes wrong
    return new NextResponse(null, { status: 400 });
  }
}
