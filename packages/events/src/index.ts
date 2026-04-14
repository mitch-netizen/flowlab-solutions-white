import type { PlatformEventStatus, PlatformEventType } from "@flowlab/contracts";
import { prisma } from "@flowlab/db";

export async function logPlatformEvent(input: {
  tenantId?: string | null;
  customerId?: string | null;
  jobId?: string | null;
  eventType: PlatformEventType;
  service: string;
  direction: "outbound" | "inbound";
  status: PlatformEventStatus;
  requestSummary?: string | null;
  responseSummary?: string | null;
  durationMs?: number | null;
  errorMessage?: string | null;
  triggeredBy?: string | null;
}) {
  return prisma.platformEventLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      customerId: input.customerId ?? null,
      jobId: input.jobId ?? null,
      eventType: input.eventType,
      service: input.service,
      direction: input.direction,
      status: input.status,
      requestSummary: input.requestSummary,
      responseSummary: input.responseSummary,
      durationMs: input.durationMs ?? null,
      errorMessage: input.errorMessage ?? null,
      triggeredBy: input.triggeredBy ?? null
    }
  });
}
