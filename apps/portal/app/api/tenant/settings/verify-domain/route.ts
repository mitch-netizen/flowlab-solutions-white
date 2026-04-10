import { requireTenantSession } from "../../../../../lib/session";
import { promises as dns } from "dns";

import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { getExpectedTenantCname } from "@flowlab/contracts/server";

export async function POST(request: Request) {
  const session = await requireTenantSession();

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

  const expectedCname = getExpectedTenantCname(tenant.slug);

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
