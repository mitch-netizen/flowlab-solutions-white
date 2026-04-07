import { promises as dns } from "dns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_SESSION_COOKIE, verifySessionToken } from "@flowlab/auth";
import { prisma } from "@flowlab/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(TENANT_SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session || session.scope !== "tenant" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { domain: string };
  const domain = body.domain?.trim().toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Get tenant slug for the expected CNAME target
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { slug: true }
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const expectedCname = `${tenant.slug}.flowlabsolutions.com.au`;

  let verified = false;
  let cnameTarget: string | null = null;
  let error: string | null = null;

  try {
    const records = await dns.resolveCname(domain);
    cnameTarget = records[0] ?? null;
    // Strip trailing dot if present
    const normalised = cnameTarget?.replace(/\.$/, "").toLowerCase() ?? "";
    verified = normalised === expectedCname;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      error = "No CNAME record found for this domain.";
    } else {
      error = "DNS lookup failed. Please try again shortly.";
    }
  }

  // Persist verification result
  await prisma.tenantProfile.updateMany({
    where: { tenantId: session.tenantId },
    data: { customDomainVerified: verified }
  });

  return NextResponse.json({
    verified,
    cnameTarget,
    expectedCname,
    error
  });
}
