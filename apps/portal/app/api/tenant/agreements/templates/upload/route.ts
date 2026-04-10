import { requireTenantSession } from "../../../../../../lib/session";

import { NextResponse } from "next/server";

import { uploadTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const session = await requireTenantSession();

  const formData = await request.formData();
  const file = formData.get("templateFile");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
  }

  const template = await uploadTenantAgreementTemplate({
    tenantId: session.tenantId,
    templateName: String(formData.get("templateName") ?? "").trim() || file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || undefined,
    fileBuffer: Buffer.from(await file.arrayBuffer()),
    signerMode: String(formData.get("signerMode") ?? "customer_only") === "customer_and_business" ? "customer_and_business" : "customer_only"
  });

  return NextResponse.redirect(new URL(`/dashboard/agreements/templates/${template.id}/builder`, request.url), 303);
}
