import { NextResponse } from "next/server";

import { adminTenantCreateSchema } from "@flowlab/contracts/server";
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
  const parsed = adminTenantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const tenant = await createTenantWithOwner({
    ...parsed.data,
    authUserId: crypto.randomUUID()
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
