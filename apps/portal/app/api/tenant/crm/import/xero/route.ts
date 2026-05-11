import { NextResponse } from "next/server";

import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import type { XeroCredentials } from "@flowlab/integrations/xero";
import { listXeroContacts } from "@flowlab/integrations/xero";

import { requireTenantSession } from "../../../../../../lib/session";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const xeroRecord = await getTenantIntegrationRecord(tenantId, "xero");
  const raw = xeroRecord?.credentialsJson ? decryptJson(xeroRecord.credentialsJson) : null;

  if (!raw?.accessToken || !raw?.xeroTenantId) {
    return NextResponse.json({ error: "xero_not_connected" }, { status: 400 });
  }

  const credentials = raw as unknown as XeroCredentials;
  const result = await listXeroContacts(credentials);

  // Persist refreshed tokens if needed
  if (result.credentials.accessToken !== credentials.accessToken) {
    await prisma.tenantIntegration.update({
      where: { tenantId_service: { tenantId, service: "xero" } },
      data: { credentialsJson: encryptJson(result.credentials as unknown as Record<string, string>) }
    });
  }

  const contacts = result.data;

  // Fetch existing customer emails for this tenant to skip duplicates
  const existing = await prisma.customer.findMany({
    where: { tenantId },
    select: { email: true }
  });
  const existingEmails = new Set(existing.map((c) => c.email.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  let noEmail = 0;

  for (const contact of contacts) {
    if (!contact.EmailAddress?.trim()) {
      noEmail++;
      continue;
    }

    const email = contact.EmailAddress.trim().toLowerCase();

    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    // Split name: prefer FirstName/LastName fields, fall back to splitting Name
    let firstName = contact.FirstName?.trim() ?? "";
    let lastName = contact.LastName?.trim() ?? "";
    if (!firstName && !lastName) {
      const parts = (contact.Name ?? "").trim().split(/\s+/);
      firstName = parts[0] ?? "Unknown";
      lastName = parts.slice(1).join(" ") || "-";
    }

    const phone = contact.Phones?.find((p) => p.PhoneType === "MOBILE" || p.PhoneType === "DEFAULT")?.PhoneNumber ?? null;
    const streetAddress = contact.Addresses?.find((a) => a.AddressType === "STREET");
    const address = streetAddress?.AddressLine1 ?? null;
    const suburb = streetAddress?.City ?? null;

    await prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email,
        phone: phone ?? undefined,
        address: address ?? undefined,
        suburb: suburb ?? undefined,
        xeroContactId: contact.ContactID,
      }
    });

    existingEmails.add(email);
    imported++;
  }

  return NextResponse.json({ imported, skipped, noEmail });
}
