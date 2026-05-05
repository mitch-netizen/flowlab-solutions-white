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
        returnTo?: string;
      }
    : Object.fromEntries((await request.formData()).entries()) as unknown as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        suburb?: string;
        notes?: string;
        returnTo?: string;
      };

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const customerName = String((body as { customerName?: string }).customerName ?? "").trim();
  const customerMobile = String((body as { customerMobile?: string }).customerMobile ?? "").trim();
  const customerEmail = String((body as { customerEmail?: string }).customerEmail ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : undefined;
  const address = body.address ? String(body.address).trim() : undefined;
  const suburb = body.suburb ? String(body.suburb).trim() : undefined;
  const notes = body.notes ? String(body.notes).trim() : undefined;
  const returnToRaw = body.returnTo ? String(body.returnTo).trim() : "";
  const isSafeReturnTo = returnToRaw.startsWith("/dashboard/");
  const returnTo = isSafeReturnTo ? returnToRaw : "";

  const isQuickQuoteCustomerCreate = !!customerName || !!customerMobile || !!customerEmail;
  const [quickFirstName, ...quickLastParts] = customerName.split(/\s+/).filter(Boolean);
  const resolvedFirstName = isQuickQuoteCustomerCreate ? (quickFirstName ?? "") : firstName;
  const resolvedLastName = isQuickQuoteCustomerCreate ? (quickLastParts.join(" ") || "Customer") : lastName;
  const resolvedPhone = isQuickQuoteCustomerCreate ? customerMobile || undefined : phone;
  const resolvedEmailInput = isQuickQuoteCustomerCreate ? customerEmail : email;
  const normalizedPhoneForSynthetic = (resolvedPhone ?? "").replace(/\D+/g, "");
  const syntheticEmail = normalizedPhoneForSynthetic
    ? `no-email+${tenantId.slice(0, 8)}-${normalizedPhoneForSynthetic}@flowlab.local`
    : `no-email+${tenantId.slice(0, 8)}-${Date.now()}@flowlab.local`;
  const resolvedEmail = (resolvedEmailInput || syntheticEmail).trim().toLowerCase();
  const hasProvidedEmail = resolvedEmailInput.trim().length > 0;

  if (
    (!isQuickQuoteCustomerCreate && (!resolvedFirstName || !resolvedLastName || !resolvedEmailInput)) ||
    (isQuickQuoteCustomerCreate && (!resolvedFirstName || !resolvedPhone))
  ) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: isQuickQuoteCustomerCreate ? "Name and mobile are required" : "First name, last name, and email are required" }, { status: 400 });
    }

    const invalidCode = isQuickQuoteCustomerCreate ? "invalid_customer_quick" : "invalid_customer";
    const invalidTarget = returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${invalidCode}` : "/dashboard/crm?error=invalid_customer";
    return NextResponse.redirect(new URL(invalidTarget, request.url), 303);
  }

  const [emailMatch, phoneMatch] = await Promise.all([
    hasProvidedEmail
      ? prisma.customer.findFirst({
          where: {
            tenantId,
            email: resolvedEmail
          }
        })
      : Promise.resolve(null),
    resolvedPhone
      ? prisma.customer.findFirst({
          where: {
            tenantId,
            phone: resolvedPhone
          }
        })
      : Promise.resolve(null)
  ]);

  if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Customer email and phone match different records" }, { status: 409 });
    }

    const conflictTarget = returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=customer_conflict` : "/dashboard/crm?error=customer_conflict";
    return NextResponse.redirect(new URL(conflictTarget, request.url), 303);
  }

  const existingCustomer = emailMatch ?? phoneMatch ?? null;

  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          phone: resolvedPhone ?? existingCustomer.phone,
          address: address ?? existingCustomer.address,
          suburb: suburb ?? existingCustomer.suburb,
          notes: notes ?? existingCustomer.notes,
          email: existingCustomer.email || resolvedEmail
        }
      })
    : await prisma.customer.create({
        data: {
          tenantId,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          email: resolvedEmail,
          phone: resolvedPhone ?? null,
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
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        email: resolvedEmailInput || resolvedEmail,
        phone: resolvedPhone,
        address,
        suburb,
        xeroContactId: existingCustomer?.xeroContactId ?? customer.xeroContactId ?? null,
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

  if (returnTo) {
    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set("customerId", customer.id);
    returnUrl.searchParams.set("created", "1");
    return NextResponse.redirect(returnUrl, 303);
  }

  return NextResponse.redirect(new URL(`/dashboard/crm/${customer.id}`, request.url), 303);
}
