import crypto from "crypto";

import { NextResponse } from "next/server";

import { processAutomationBatch } from "@flowlab/automation";
import { findTenantIdByXeroTenantId, logWebhookFailure, prisma, syncTenantInvoiceFromXero } from "@flowlab/db";

function verifyXeroSignature(rawBody: string, signature: string, key: string): boolean {
  const hmac = crypto.createHmac("sha256", key).update(rawBody).digest("base64");
  const hmacBuf = Buffer.from(hmac);
  const sigBuf = Buffer.from(signature);
  if (hmacBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(hmacBuf, sigBuf);
}

interface XeroWebhookEvent {
  resourceId: string;
  eventType: string;
  eventCategory: string;
  tenantId: string;
}

interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
}

// Xero requires a raw body to validate the HMAC signature — do not use NextRequest.json()
export async function POST(request: Request) {
  const webhookKey = process.env.XERO_WEBHOOK_KEY;
  const rawBody = await request.text();
  const signature = request.headers.get("x-xero-signature") ?? "";

  if (!webhookKey) {
    await logWebhookFailure({
      service: "xero",
      errorMessage: "XERO_WEBHOOK_KEY not configured",
      requestSummary: "Xero webhook rejected — platform webhook key missing"
    });
    return new NextResponse(null, { status: 401 });
  }

  if (!signature || !verifyXeroSignature(rawBody, signature, webhookKey)) {
    await logWebhookFailure({
      service: "xero",
      errorMessage: "Invalid x-xero-signature",
      requestSummary: "Xero webhook rejected — signature mismatch"
    });
    // Xero uses 401 to detect intent-to-receive failure — return exactly that
    return new NextResponse(null, { status: 401 });
  }

  let payload: XeroWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Xero intent-to-receive handshake: empty events array, just acknowledge
  if (!payload.events || payload.events.length === 0) {
    return new NextResponse(null, { status: 200 });
  }

  for (const event of payload.events) {
    if (event.eventCategory !== "INVOICE") continue;

    const tenantId = await findTenantIdByXeroTenantId(event.tenantId);
    if (!tenantId) continue;

    const invoice = await prisma.invoice.findFirst({
      where: { tenantId, xeroInvoiceId: event.resourceId },
      select: { id: true }
    });

    if (!invoice) continue;

    try {
      await syncTenantInvoiceFromXero({ tenantId, invoiceId: invoice.id });
      await processAutomationBatch(5);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logWebhookFailure({
        tenantId,
        service: "xero",
        errorMessage: msg,
        requestSummary: `Failed to sync Xero invoice ${event.resourceId.slice(0, 8)}…`
      });
    }
  }

  return new NextResponse(null, { status: 200 });
}
