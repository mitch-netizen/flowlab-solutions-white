import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { saveTenantScheduleSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    workSchedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    personalCommitments: Array<{
      title: string;
      address?: string | null;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };

  await saveTenantScheduleSettings({
    tenantId: session.tenantId,
    workSchedule: body.workSchedule ?? [],
    personalCommitments: body.personalCommitments ?? []
  });

  return NextResponse.json({ ok: true });
}
