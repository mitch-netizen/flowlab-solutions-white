import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import type { MobileJobAction } from "@flowlab/contracts";
import { syncMobileJobActions } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const body = (await request.json()) as { actions?: MobileJobAction[] };
  const actions = Array.isArray(body.actions) ? body.actions : [];
  const results = await syncMobileJobActions({
    tenantId: session.tenantId,
    actions
  });

  return NextResponse.json({ ok: true, results });
}
