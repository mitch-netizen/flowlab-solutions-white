import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { updateOnboardingProgress } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { step: number; completed?: boolean };

  await updateOnboardingProgress(session.sub, body.step, body.completed);

  return NextResponse.json({ ok: true });
}
