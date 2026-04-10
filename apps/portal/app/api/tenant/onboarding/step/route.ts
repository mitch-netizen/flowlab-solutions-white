import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { updateOnboardingProgress } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const body = await request.json() as { step: number; completed?: boolean };

  await updateOnboardingProgress(session.sub, body.step, body.completed);

  return NextResponse.json({ ok: true });
}
