import { requireTenantSession } from "../../../../../lib/session";

import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { createInvoiceDraft, getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, encryptJson } from "@flowlab/integrations";
import type { XeroCredentials } from "@flowlab/integrations/xero";
import { upsertXeroContact, createXeroInvoice } from "@flowlab/integrations/xero";

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const { tenantId } = session;

  const formData = await request.formData();
  const customerId = String(formData.get("customerId") ?? "");
  const jobId = formData.get("jobId") ? String(formData.get("jobId")) : undefined;
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "");

  if (!customerId || amount <= 0) {
    return NextResponse.json({ error: "Customer and amount are required" }, { status: 400 });
  }

  // ── Xero path: push to Xero first, then mirror locally ────────────────────
  const xeroIntegration = await getTenantIntegrationRecord(tenantId, "xero");
  const xeroCredentialsRaw = xeroIntegration?.credentialsJson
    ? decryptJson(xeroIntegration.credentialsJson)
    : null;

  const isXeroConnected =
    xeroIntegration?.status === "connected" &&
    xeroCredentialsRaw?.accessToken &&
    xeroCredentialsRaw?.xeroTenantId;

  if (isXeroConnected && xeroCredentialsRaw) {
    const credentials = xeroCredentialsRaw as unknown as XeroCredentials;

    // Fetch the customer record (we need xeroContactId + personal details)
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 1. Upsert customer as a Xero Contact (idempotent — uses xeroContactId if set)
    let xeroContactId = customer.xeroContactId;
    let updatedCredentials = credentials;

    try {
      const contactResult = await upsertXeroContact(credentials, {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        suburb: customer.suburb,
        xeroContactId: customer.xeroContactId,
      });

      updatedCredentials = contactResult.credentials;
      xeroContactId = contactResult.data.ContactID;

      // Persist the Xero Contact ID on the customer if it's new
      if (xeroContactId !== customer.xeroContactId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { xeroContactId }
        });
      }
    } catch (err) {
      // If Xero contact sync fails, abort — don't create a dangling local invoice
      return NextResponse.json(
        { error: `Failed to sync customer to Xero: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 }
      );
    }

    // 2. Determine invoice number (peek at count to keep consistent with local numbering)
    const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

    // 3. Create the invoice in Xero — Xero is the source of truth
    const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let xeroInvoiceId: string;

    try {
      const invoiceResult = await createXeroInvoice(updatedCredentials, {
        xeroContactId: xeroContactId!,
        invoiceNumber,
        description: note || "Field service",
        amount,
        dueAt,
        reference: jobId ? `Job ${jobId.slice(0, 8)}` : undefined,
      });

      xeroInvoiceId = invoiceResult.data.InvoiceID;
      updatedCredentials = invoiceResult.credentials;

      // Persist refreshed Xero tokens if they were refreshed during this call
      if (updatedCredentials.accessToken !== credentials.accessToken) {
        await prisma.tenantIntegration.update({
          where: { tenantId_service: { tenantId, service: "xero" } },
          data: { credentialsJson: encryptJson(updatedCredentials as unknown as Record<string, string>) }
        });
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to create invoice in Xero: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 }
      );
    }

    // 4. Create local mirror record (reflects the Xero invoice)
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId,
        jobId: jobId ?? undefined,
        number: invoiceNumber,
        amount,
        status: "sent",
        dueAt,
        xeroInvoiceId,
        xeroStatus: "AUTHORISED",
        xeroSyncedAt: new Date(),
        accessToken: crypto.randomUUID().replace(/-/g, ""),
      }
    });

    // 5. Update job status to invoiced
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId, tenantId },
        data: { status: "invoiced" }
      });
    }

    // 6. Fire automation (email/SMS notifications)
    await prisma.automationJob.create({
      data: {
        tenantId,
        kind: "invoice.created",
        status: "pending",
        payloadJson: JSON.stringify({
          invoiceId: invoice.id,
          customerId,
          tenantId,
          xeroInvoiceId,
        }),
        availableAt: new Date(),
      }
    });
    await processAutomationBatch(5);

    return NextResponse.redirect(new URL("/dashboard/invoices", request.url), 303);
  }

  // ── Fallback: local-only invoice (Xero not connected) ─────────────────────
  await createInvoiceDraft({ tenantId, customerId, jobId, amount, note });
  await processAutomationBatch(5);

  return NextResponse.redirect(new URL("/dashboard/invoices", request.url), 303);
}
