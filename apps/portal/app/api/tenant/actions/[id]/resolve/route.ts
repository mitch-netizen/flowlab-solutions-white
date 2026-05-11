import { NextResponse } from "next/server";

import { resolveActionSuggestion } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");
  const requestedReturnTo = String(formData.get("returnTo") ?? "/dashboard/actions");
  const returnTo = requestedReturnTo.startsWith("/dashboard") ? requestedReturnTo : "/dashboard/actions";

  if (action !== "dismiss" && action !== "snooze") {
    const separator = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${separator}error=invalid_action`, request.url), 303);
  }

  const result = await resolveActionSuggestion({
    tenantId: session.tenantId,
    id,
    action
  });

  const notice = result.count > 0 ? "resolved" : "not_found";
  const separator = returnTo.includes("?") ? "&" : "?";
  return NextResponse.redirect(new URL(`${returnTo}${separator}notice=${notice}`, request.url), 303);
}
