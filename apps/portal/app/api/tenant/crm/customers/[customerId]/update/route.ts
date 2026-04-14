import { NextResponse } from "next/server";

import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import type { XeroCredentials } from "@flowlab/integrations/xero";
import { upsertXeroContact } from "@flowlab/integrations/xero";

import { requireTenantSession } from "../../../../../../../lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await requireTenantSession();
  const { customerId } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") ?? `/dashboard/crm/${customerId}`);

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const suburb = String(formData.get("suburb") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!firstName || !lastName || !email) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_customer`, request.url), 303);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId: session.tenantId
    }
  });

  if (!customer) {
    return NextResponse.redirect(new URL("/dashboard/crm?error=customer_missing", request.url), 303);
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      firstName,
      lastName,
      email,
      phone,
      address,
      suburb,
      notes
    }
  });

  const xeroIntegration = await getTenantIntegrationRecord(session.tenantId, "xero");
  const xeroCredentialsRaw = xeroIntegration?.credentialsJson
    ? decryptJson(xeroIntegration.credentialsJson)
    : null;

  const isXeroConnected =
    xeroIntegration?.status === "connected" &&
    xeroCredentialsRaw?.accessToken &&
    xeroCredentialsRaw?.xeroTenantId;

  if (isXeroConnected && xeroCredentialsRaw) {
    try {
      const credentials = xeroCredentialsRaw as unknown as XeroCredentials;
      const result = await upsertXeroContact(credentials, {
        firstName,
        lastName,
        email,
        phone: phone ?? undefined,
        address: address ?? undefined,
        suburb: suburb ?? undefined,
        xeroContactId: customer.xeroContactId ?? null
      });

      await prisma.customer.update({
        where: { id: updated.id },
        data: { xeroContactId: result.data.ContactID }
      });

      if (result.credentials.accessToken !== credentials.accessToken) {
        await prisma.tenantIntegration.update({
          where: { tenantId_service: { tenantId: session.tenantId, service: "xero" } },
          data: { credentialsJson: encryptJson(result.credentials as unknown as Record<string, string>) }
        });
      }
    } catch {
      return NextResponse.redirect(new URL(`${returnTo}?error=xero_sync_failed`, request.url), 303);
    }
  }

  return NextResponse.redirect(new URL(`${returnTo}?updated=1`, request.url), 303);
}
