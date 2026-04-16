import { NextResponse } from "next/server";

import {
  BREVO_EMAIL_INTEGRATION_SERVICE,
  BREVO_SMS_INTEGRATION_SERVICE
} from "@flowlab/contracts";
import { getTenantIntegrationRecord, prisma } from "@flowlab/db";
import { decryptJson, sendEmail, sendSms, buildBrandedEmailHtml } from "@flowlab/integrations";
import { logPlatformEvent } from "@flowlab/events";

import { requireTenantSession } from "../../../../../lib/session";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();

  const customerId = String(formData.get("customerId") ?? "").trim();
  const jobId = String(formData.get("jobId") ?? "").trim() || null;
  const invoiceId = String(formData.get("invoiceId") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/crm");
  const channel = String(formData.get("channel") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!customerId || !body || !["email", "sms"].includes(channel)) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_message`, request.url), 303);
  }

  const [customer, tenant, job, invoice] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: session.tenantId
      }
    }),
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { profile: true }
    }),
    jobId
      ? prisma.job.findFirst({
          where: {
            id: jobId,
            tenantId: session.tenantId
          }
        })
      : Promise.resolve(null),
    invoiceId
      ? prisma.invoice.findFirst({
          where: {
            id: invoiceId,
            tenantId: session.tenantId
          }
        })
      : Promise.resolve(null)
  ]);

  if (!customer) {
    return NextResponse.redirect(new URL(`${returnTo}?error=customer_missing`, request.url), 303);
  }

  if ((job && job.customerId !== customer.id) || (invoice && invoice.customerId !== customer.id)) {
    return NextResponse.redirect(new URL(`${returnTo}?error=context_mismatch`, request.url), 303);
  }

  try {
    if (channel === "email") {
      if (!customer.email) {
        throw new Error("Customer email is missing");
      }

      const emailCredentials = decryptJson(
        (await getTenantIntegrationRecord(session.tenantId, BREVO_EMAIL_INTEGRATION_SERVICE))?.credentialsJson ?? ""
      );
      const businessName = tenant?.profile?.businessName ?? "FlowLab";
      const html = buildBrandedEmailHtml({
        businessName,
        logoUrl: tenant?.profile?.logoUrl,
        primaryColour: tenant?.profile?.primaryColour,
        bodyHtml: `<p>${escapeHtml(body).replace(/\n/g, "<br />")}</p>`,
        footerText: `${businessName}${tenant?.profile?.email ? ` · ${tenant.profile.email}` : ""}`
      });

      await sendEmail(emailCredentials, customer.email, subject || `Message from ${businessName}`, html);
    } else {
      if (!customer.phone) {
        throw new Error("Customer phone is missing");
      }

      const smsCredentials = decryptJson(
        (await getTenantIntegrationRecord(session.tenantId, BREVO_SMS_INTEGRATION_SERVICE))?.credentialsJson ?? ""
      );
      await sendSms(smsCredentials, customer.phone, body);
    }

    await prisma.communication.create({
      data: {
        tenantId: session.tenantId,
        customerId: customer.id,
        jobId,
        invoiceId,
        channel,
        direction: "outbound",
        subject: subject || null,
        body,
        status: "sent"
      }
    });

    await logPlatformEvent({
      tenantId: session.tenantId,
      eventType: "api_call",
      service: channel === "email" ? "brevo_email" : "brevo_sms",
      direction: "outbound",
      status: "success",
      requestSummary: `Manual ${channel} sent to ${customer.firstName} ${customer.lastName}`,
      responseSummary: subject || body.slice(0, 120),
      triggeredBy: "tenant_manual_communication",
      customerId: customer.id,
      jobId: jobId ?? invoice?.jobId ?? null
    });

    return NextResponse.redirect(new URL(`${returnTo}?message=sent`, request.url), 303);
  } catch (error) {
    await prisma.communication.create({
      data: {
        tenantId: session.tenantId,
        customerId: customer.id,
        jobId,
        invoiceId,
        channel,
        direction: "outbound",
        subject: subject || null,
        body,
        status: "failed"
      }
    });

    await logPlatformEvent({
      tenantId: session.tenantId,
      eventType: "error",
      service: channel === "email" ? "brevo_email" : "brevo_sms",
      direction: "outbound",
      status: "failed",
      requestSummary: `Manual ${channel} failed`,
      errorMessage: error instanceof Error ? error.message : String(error),
      triggeredBy: "tenant_manual_communication",
      customerId: customer.id,
      jobId: jobId ?? invoice?.jobId ?? null
    });

    return NextResponse.redirect(new URL(`${returnTo}?error=message_failed`, request.url), 303);
  }
}
