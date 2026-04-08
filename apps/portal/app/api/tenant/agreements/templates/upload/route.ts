import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { uploadTenantAgreementTemplate } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const file = formData.get("templateFile");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
  }

  await uploadTenantAgreementTemplate({
    tenantId: session.tenantId,
    templateName: String(formData.get("templateName") ?? "").trim() || file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || undefined,
    fileBuffer: Buffer.from(await file.arrayBuffer()),
    signerMode: String(formData.get("signerMode") ?? "customer_only") === "customer_and_business" ? "customer_and_business" : "customer_only"
  });

  return NextResponse.redirect(new URL("/dashboard/agreements", request.url), 303);
}
