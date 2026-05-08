import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@flowlab/auth";
import { adminTenantCreateSchema } from "@flowlab/contracts/server";
import { createTenantWithOwner, listTenants, prisma } from "@flowlab/db";
import { getPlatformSession } from "../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = adminTenantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { scope: "tenant" }
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Could not create tenant auth user" },
      { status: 400 }
    );
  }

  try {
    const tenant = await createTenantWithOwner({
      ...parsed.data,
      authUserId: authData.user.id
    });

    await prisma.platformEventLog.create({
      data: {
        tenantId: tenant.id,
        eventType: "info",
        service: "worker",
        direction: "inbound",
        status: "success",
        requestSummary: "Tenant created by superadmin",
        responseSummary: `${tenant.slug}.flowlabsolutions.au`,
        triggeredBy: `superadmin_${session.email}`
      }
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    await admin.auth.admin.deleteUser(authData.user.id);
    console.error("Admin tenant creation failed", error);
    return NextResponse.json({ error: "Could not create tenant" }, { status: 500 });
  }
}
