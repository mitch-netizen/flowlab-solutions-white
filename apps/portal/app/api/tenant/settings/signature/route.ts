import { NextResponse } from "next/server";

import { updateEmailSignatureSettings } from "@flowlab/db";

import { requireTenantSession } from "../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();

  await updateEmailSignatureSettings({
    tenantId: session.tenantId,
    emailSignatureEnabled: formData.get("emailSignatureEnabled") === "1",
    emailSignatureAdHocDefault: formData.get("emailSignatureAdHocDefault") === "1",
    emailSignatureCustomHtml: String(formData.get("emailSignatureCustomHtml") ?? "").trim() || null
  });

  return NextResponse.redirect(new URL("/dashboard/settings?signature=saved", request.url), 303);
}
