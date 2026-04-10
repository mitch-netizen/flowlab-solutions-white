import { requireTenantSession } from "../../../../../lib/session";
import JSZip from "jszip";

import { NextResponse } from "next/server";

import { getTenantById } from "@flowlab/db";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";
import { buildAutomationBlueprintPayloads } from "@flowlab/integrations";

export async function GET(request: Request) {
  const session = await requireTenantSession();

  const tenant = await getTenantById(session.tenantId);

  if (!tenant?.profile) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  const payloads = buildAutomationBlueprintPayloads({
    tenantSlug: tenant.slug,
    businessName: tenant.profile.businessName,
    rootDomain: getCanonicalRootDomain()
  });

  const zip = new JSZip();

  for (const payload of payloads) {
    zip.file(payload.filename, payload.contents);
  }

  zip.file(
    "README.txt",
    [
      `FlowLab automation templates for ${tenant.profile.businessName}`,
      "",
      "Import each JSON file into Make.com and replace the {{...}} placeholders with tenant-owned credentials.",
      "Webhook defaults point to the tenant's FlowLab automation endpoints."
    ].join("\n")
  );

  const archive = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(Buffer.from(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${tenant.slug}-make-blueprints.zip\"`
    }
  });
}
