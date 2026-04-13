/**
 * POST /api/tenant/crm/customers
 * Create a new CRM customer and immediately sync to Xero if connected.
 * Xero Contact ID is saved back to the customer record so future operations
 * (invoicing, contact updates) use the same Xero account.
 */
import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import type { XeroCredentials } from "@flowlab/integrations/xero";
import { upsertXeroContact } from "@flowlab/integrations/xero";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const body = await request.json() as {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    suburb?: string;
    notes?: string;
  };

  const { firstName, lastName, email, phone, address, suburb, notes } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
  }

  // Create the customer record
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      firstName,
      lastName,
      email,
      phone: phone ?? null,
      address: address ?? null,
      suburb: suburb ?? null,
      notes: notes ?? null,
    }
  });

  // ── Sync to Xero if connected ─────────────────────────────────────────────
  const xeroIntegration = await getTenantIntegrationRecord(tenantId, "xero");
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
        phone,
        address,
        suburb,
        xeroContactId: null,
      });

      // Save Xero Contact ID and refresh tokens if needed
      await prisma.customer.update({
        where: { id: customer.id },
        data: { xeroContactId: result.data.ContactID }
      });

      if (result.credentials.accessToken !== credentials.accessToken) {
        await prisma.tenantIntegration.update({
          where: { tenantId_service: { tenantId, service: "xero" } },
          data: { credentialsJson: encryptJson(result.credentials as unknown as Record<string, string>) }
        });
      }
    } catch {
      // Xero sync failure is non-fatal — customer was created locally.
      // The next invoice creation will attempt the Xero Contact sync again.
    }
  }

  return NextResponse.json({ id: customer.id, ok: true });
}
