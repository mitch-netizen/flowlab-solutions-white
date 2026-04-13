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
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await request.json() as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        suburb?: string;
        notes?: string;
      }
    : Object.fromEntries((await request.formData()).entries()) as unknown as {
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
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
    }

    return NextResponse.redirect(new URL("/dashboard/crm?error=invalid_customer", request.url), 303);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      tenantId,
      email: normalizedEmail
    }
  });

  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName,
          lastName,
          phone: phone ?? existingCustomer.phone,
          address: address ?? existingCustomer.address,
          suburb: suburb ?? existingCustomer.suburb,
          notes: notes ?? existingCustomer.notes
        }
      })
    : await prisma.customer.create({
        data: {
          tenantId,
          firstName,
          lastName,
          email: normalizedEmail,
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

  if (contentType.includes("application/json")) {
    return NextResponse.json({ id: customer.id, ok: true });
  }

  return NextResponse.redirect(new URL(`/dashboard/crm/${customer.id}`, request.url), 303);
}
