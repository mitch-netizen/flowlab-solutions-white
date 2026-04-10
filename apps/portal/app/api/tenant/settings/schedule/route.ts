import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { saveTenantScheduleSettings } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

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
