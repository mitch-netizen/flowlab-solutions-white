import { NextResponse } from "next/server";

import { createEnquiry } from "@flowlab/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant" }, { status: 400 });
  }

  await createEnquiry({
    tenantId,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    suburb: String(formData.get("suburb") ?? ""),
    serviceRequest: String(formData.get("serviceRequest") ?? "")
  });

  return NextResponse.redirect(new URL("/enquiry?submitted=1", request.url), 303);
}
