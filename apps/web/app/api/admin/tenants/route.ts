import { NextResponse } from "next/server";

import { createTenantWithOwner, listTenants } from "@flowlab/db";
import { getPlatformSession } from "../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const tenant = await createTenantWithOwner({
    businessName: body.businessName,
    ownerName: body.ownerName,
    email: body.email,
    authUserId: crypto.randomUUID(),
    phone: body.phone,
    suburb: body.suburb,
    businessType: body.businessType,
    plan: body.plan
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
