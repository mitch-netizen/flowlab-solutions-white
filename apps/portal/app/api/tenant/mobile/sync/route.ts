import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import type { MobileJobAction } from "@flowlab/contracts";
import { syncMobileJobActions } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { actions?: MobileJobAction[] };
  const actions = Array.isArray(body.actions) ? body.actions : [];
  const results = await syncMobileJobActions({
    tenantId: session.tenantId,
    actions
  });

  return NextResponse.json({ ok: true, results });
}
