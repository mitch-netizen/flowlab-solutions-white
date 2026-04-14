import { NextResponse } from "next/server";

import { saveAutomationPreference } from "@flowlab/db";
import type { AutomationPreferenceKey } from "@flowlab/contracts";
import { automationPreferenceKeySchema } from "@flowlab/contracts";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();
  const keyResult = automationPreferenceKeySchema.safeParse(String(formData.get("key") ?? ""));
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/automations");

  if (!keyResult.success) {
    return NextResponse.redirect(new URL("/dashboard/automations?error=invalid_preference", request.url), 303);
  }

  await saveAutomationPreference({
    tenantId: session.tenantId,
    key: keyResult.data as AutomationPreferenceKey,
    enabled
  });

  const url = new URL(returnTo, request.url);
  url.searchParams.set("saved", keyResult.data);
  return NextResponse.redirect(url, 303);
}
