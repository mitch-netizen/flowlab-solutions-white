import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { updateOnboardingProgress } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const body = (await request.json()) as { step: number; completed?: boolean };

  const requestedStep = Number.isFinite(body.step) ? Math.trunc(body.step) : 1;
  const step = Math.min(Math.max(requestedStep, 1), 6);

  await updateOnboardingProgress(session.sub, step, body.completed);

  return NextResponse.json({ ok: true });
}
