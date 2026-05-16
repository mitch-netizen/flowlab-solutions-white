import { signCustomerToken } from "@flowlab/auth";
import {
  BREVO_EMAIL_INTEGRATION_SERVICE,
  BREVO_SMS_INTEGRATION_SERVICE,
  logger
} from "@flowlab/contracts";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";
import {
  claimPendingAutomationJobs,
  completeAutomationJob,
  enqueueRecurringAutomationJobs,
  failAutomationJob,
  getPendingRateSuggestions,
  getSchedulerRecommendations,
  isAutomationPreferenceEnabled,
  prisma,
  resolveIntegrationCredentials,
  saveRateSuggestions
} from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import {
  buildActionSection,
  buildBrandedEmailHtml,
  buildEmailButton,
  buildEmailSignature,
  fireMakeWebhook,
  sendEmail,
  sendSms
} from "@flowlab/integrations";

type ClaimedJob = Awaited<ReturnType<typeof claimPendingAutomationJobs>>[number];

const SMS_PROVIDER_SERVICE = "brevo_sms";
const EMAIL_PROVIDER_SERVICE = "brevo_email";

async function getTenantWithProfile(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { profile: true }
  });
}

async function getCustomer(customerId: string) {
  return prisma.customer.findUnique({ where: { id: customerId } });
}

async function getInvoice(invoiceId: string) {
  return prisma.invoice.findUnique({ where: { id: invoiceId } });
}

function createTrackingUrl(
  destinationUrl: string,
  jobId: string,
  buttonLabel: string,
  rootDomain: string
): string {
  // Encode tracking data in URL parameters for the tracking endpoint
  const trackingParams = new URLSearchParams({
    dest: destinationUrl,
    job: jobId,
    btn: buttonLabel
  });
  return `https://${rootDomain}/api/track/click?${trackingParams.toString()}`;
}

function buildTenantSignatureFooter(
  profile: { businessName: string; logoUrl?: string | null; primaryColour?: string | null; phone?: string | null; email?: string | null; address?: string | null; suburb?: string | null; state?: string | null; postcode?: string | null; abn?: string | null; emailSignatureEnabled: boolean; emailSignatureCustomHtml?: string | null } | null | undefined,
  businessName: string
): string {
  if (!profile?.emailSignatureEnabled) return businessName;
  return buildEmailSignature({
    businessName,
    logoUrl: profile.logoUrl,
    primaryColour: profile.primaryColour,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    suburb: profile.suburb,
    state: profile.state,
    postcode: profile.postcode,
    abn: profile.abn,
    customHtml: profile.emailSignatureCustomHtml
  });
}

async function getJob(jobId: string) {
  return prisma.job.findUnique({ where: { id: jobId } });
}

async function recordCommunication(input: {
  tenantId: string;
  customerId?: string | null;
  jobId?: string | null;
  invoiceId?: string | null;
  channel: "email" | "sms";
  subject: string;
  body: string;
  status: "sent" | "failed";
}) {
  await prisma.communication.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId ?? null,
      jobId: input.jobId ?? null,
      invoiceId: input.invoiceId ?? null,
      channel: input.channel,
      direction: "outbound",
      subject: input.subject,
      body: input.body,
      status: input.status
    }
  });
}

function buildFeedbackLink(input: { tenantSlug: string; tenantId: string; jobId: string }) {
  const rootDomain = getCanonicalRootDomain();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const token = signCustomerToken({
    tenantId: input.tenantId,
    resourceId: input.jobId,
    resourceType: "feedback",
    expiresAt
  });

  return `https://${input.tenantSlug}.${rootDomain}/feedback/${token}`;
}

function buildInvoicePaymentLink(input: { tenantSlug: string; tenantId: string; invoiceId: string }) {
  const rootDomain = getCanonicalRootDomain();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
  const token = signCustomerToken({
    tenantId: input.tenantId,
    resourceId: input.invoiceId,
    resourceType: "invoice",
    expiresAt
  });

  return `https://${input.tenantSlug}.${rootDomain}/invoice/${token}/pay`;
}

function buildInvoiceViewLink(input: { tenantSlug: string; tenantId: string; invoiceId: string }) {
  const rootDomain = getCanonicalRootDomain();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
  const token = signCustomerToken({
    tenantId: input.tenantId,
    resourceId: input.invoiceId,
    resourceType: "invoice",
    expiresAt
  });

  return `https://${input.tenantSlug}.${rootDomain}/invoice/${token}`;
}

async function getCredentials(
  tenantId: string,
  service: typeof BREVO_SMS_INTEGRATION_SERVICE | typeof BREVO_EMAIL_INTEGRATION_SERVICE | "make_com"
) {
  const envFallback =
    service === BREVO_SMS_INTEGRATION_SERVICE
      ? { apiKey: process.env.BREVO_API_KEY, sender: process.env.BREVO_SMS_SENDER }
      : service === BREVO_EMAIL_INTEGRATION_SERVICE
        ? { apiKey: process.env.BREVO_API_KEY, fromEmail: process.env.BREVO_FROM_EMAIL, fromName: process.env.BREVO_FROM_NAME }
        : undefined;
  const resolved = await resolveIntegrationCredentials({ tenantId, service, envFallback });
  return resolved.credentials;
}

function shouldLogMakeWebhookResult(result: { status: number; body: string }) {
  return !(result.status === 0 && result.body.startsWith("No webhook URL configured for key:"));
}

async function maybeLogMakeWebhookResult(input: {
  tenantId: string;
  result: { ok: boolean; status: number; body: string };
  requestSummary: string;
  triggeredBy: string;
  eventType?: "webhook_fired" | "info";
}) {
  if (!shouldLogMakeWebhookResult(input.result)) {
    return;
  }

  await logPlatformEvent({
    tenantId: input.tenantId,
    eventType: input.eventType ?? "webhook_fired",
    service: "make",
    direction: "outbound",
    status: input.result.ok ? "success" : input.result.status === 0 ? "pending" : "failed",
    requestSummary: input.requestSummary,
    responseSummary: input.result.body.slice(0, 200),
    triggeredBy: input.triggeredBy
  });
}

async function fireTenantMakeWebhook(input: {
  tenantId: string;
  credentials: Record<string, string>;
  webhookKey: string;
  payload: Record<string, unknown>;
  requestSummary: string;
  triggeredBy: string;
  eventType?: "webhook_fired" | "info";
}) {
  const enabled = await isAutomationPreferenceEnabled(input.tenantId, "advanced_make_webhooks");

  if (!enabled) {
    return { ok: false, status: 0, body: "Advanced Make webhooks disabled" };
  }

  const result = await fireMakeWebhook(input.credentials, input.webhookKey, input.payload);
  await maybeLogMakeWebhookResult({
    tenantId: input.tenantId,
    result,
    requestSummary: input.requestSummary,
    triggeredBy: input.triggeredBy,
    eventType: input.eventType
  });
  return result;
}

async function processJob(job: ClaimedJob) {
  const payload = job.payload as Record<string, string>;
  const tenantId = job.tenantId ?? "";

  switch (job.kind) {
    case "quote.accepted": {
      const [makeCredentials, brevoEmailCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const tenantSlug = tenant?.slug ?? "";
      const agreementLink = buildFeedbackLink({
        tenantSlug,
        tenantId,
        jobId: payload.agreementId
      }).replace("/feedback/", "/sign/");

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "quoteAcceptedWebhookUrl",
        requestSummary: "Make.com quote accepted webhook",
        triggeredBy: "worker_quote_accepted",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "quoteAccepted",
          triggered_at: new Date().toISOString(),
          quote_id: payload.quoteId,
          agreement_id: payload.agreementId,
          quote_title: payload.title,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const subject = `Quote accepted — ${payload.title} · ${businessName}`;
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Thanks for accepting your quote from <strong>${businessName}</strong>.</p>
              <p>Quote: <strong>${payload.title}</strong></p>
              <p>Your service agreement is ready to review and sign.</p>
              ${buildActionSection(
                "🖊️ Review & Sign",
                "Review the agreement and sign electronically to confirm.",
                [
                  { label: "Sign Agreement", href: agreementLink, variant: "success" },
                  { label: "View Quote", href: `https://${tenantSlug}.${getCanonicalRootDomain()}/quote/${payload.quoteId}`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject,
            body: `Quote ${payload.title} accepted — agreement ready for signature.`,
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Quote accepted email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Quote acceptance confirmation delivered",
            triggeredBy: "worker_quote_accepted"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject: `Quote accepted — ${payload.title}`,
            body: `Quote ${payload.title} accepted.`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Quote accepted email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_quote_accepted"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, thanks for accepting your quote from ${businessName}. Your service agreement will arrive shortly — please check your email.`;
        try {
          const brevoSmsCredentials = await getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE);
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: `Quote accepted · ${payload.title ?? "Quote"}`,
            body: smsBody,
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `SMS sent to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Quote accepted confirmation SMS delivered",
            triggeredBy: "worker_quote_accepted"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: `Quote accepted · ${payload.title ?? "Quote"}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Quote accepted SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_quote_accepted"
          });
        }
      }
      break;
    }

    case "agreement.signed": {
      const [makeCredentials, brevoEmailCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "agreementSignedWebhookUrl",
        requestSummary: "Make.com agreement signed webhook",
        triggeredBy: "worker_agreement_signed",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "agreementSigned",
          triggered_at: new Date().toISOString(),
          agreement_id: payload.agreementId,
          quote_id: payload.quoteId,
          agreement_title: payload.title,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const subject = `Agreement signed — ${businessName}`;
        try {
          const tenantSlug = tenant?.slug ?? "";
          const agreementLink = buildFeedbackLink({
            tenantSlug,
            tenantId,
            jobId: payload.agreementId
          }).replace("/feedback/", "/sign/");

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Your service agreement with <strong>${businessName}</strong> has been signed successfully.</p>
              <p>Agreement: <strong>${payload.title}</strong></p>
              <p>We'll be in touch shortly to confirm your booking details.</p>
              ${buildActionSection(
                "✅ Next Steps",
                "Review your agreement or contact us with any questions.",
                [
                  { label: "View Agreement", href: agreementLink, variant: "primary" },
                  { label: "Contact Support", href: `https://${tenantSlug}.${getCanonicalRootDomain()}/support`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(
            brevoEmailCredentials,
            customer.email,
            subject,
            html
          );
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject,
            body: `Agreement ${payload.title} signed successfully.`,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Agreement confirmation email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Signed agreement confirmation delivered",
            triggeredBy: "worker_agreement_signed"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject,
            body: `Agreement ${payload.title} signed successfully.`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Agreement signed email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_agreement_signed"
          });
        }
      }
      break;
    }

    case "invoice.created": {
      const [makeCredentials, brevoEmailCredentials, brevoSmsCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "an amount";
      const paymentLink = invoice?.paymentLink ?? buildInvoicePaymentLink({
        tenantSlug: tenant?.slug ?? "",
        tenantId,
        invoiceId: invoice?.id ?? payload.invoiceId
      });
      const invoiceLink = buildInvoiceViewLink({
        tenantSlug: tenant?.slug ?? "",
        tenantId,
        invoiceId: invoice?.id ?? payload.invoiceId
      });

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "jobCompleteWebhookUrl",
        requestSummary: "Make.com invoice created webhook",
        triggeredBy: "worker_invoice_created",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "invoiceCreated",
          triggered_at: new Date().toISOString(),
          invoice_id: invoice?.id,
          invoice_number: invoice?.number ?? payload.number,
          amount: invoice?.amount,
          payment_link: paymentLink,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const subject = `Invoice ${invoice?.number ?? payload.number} from ${businessName}`;
        try {
          const rootDomain = getCanonicalRootDomain();
          const trackedPaymentLink = createTrackingUrl(paymentLink, job.id, "Pay Now", rootDomain);
          const trackedInvoiceLink = createTrackingUrl(invoiceLink, job.id, "View Invoice", rootDomain);

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer?.firstName ?? "there"},</p>
              <p>Your invoice from <strong>${businessName}</strong> is ready.</p>
              <p><strong>Invoice number:</strong> ${invoice?.number ?? payload.number}<br/><strong>Amount due:</strong> ${amount}</p>
              <p style="color:#64748b;font-size:13px;">Payment is due within 7 days.</p>
              ${buildActionSection(
                "💳 Ready to Pay?",
                "View your invoice details and pay securely online.",
                [
                  { label: "Pay Now", href: trackedPaymentLink, variant: "success" },
                  { label: "View Invoice", href: trackedInvoiceLink, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(
            brevoEmailCredentials,
            customer.email,
            subject,
            html
          );
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "email",
            subject,
            body: `Invoice ${invoice?.number ?? payload.number} issued for ${amount}.`,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Invoice email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.number} sent`,
            triggeredBy: "worker_invoice_created"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "email",
            subject,
            body: `Invoice ${invoice?.number ?? payload.number} issued for ${amount}.`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Invoice email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_invoice_created"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = paymentLink
          ? `Hi ${customer?.firstName ?? "there"}, your invoice for ${amount} from ${businessName} is ready. Pay here: ${paymentLink}`
          : `Hi ${customer?.firstName ?? "there"}, your invoice ${invoice?.number ?? payload.number} for ${amount} from ${businessName} is ready. Check your email to pay.`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "sms",
            subject: `Invoice issued · ${invoice?.number ?? payload.number}`,
            body: smsBody,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Invoice SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.number} SMS delivered`,
            triggeredBy: "worker_invoice_created"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "sms",
            subject: `Invoice issued · ${invoice?.number ?? payload.number}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Invoice SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_invoice_created"
          });
        }
      }
      break;
    }

    case "invoice.paid": {
      const [makeCredentials, brevoEmailCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "jobCompleteWebhookUrl",
        requestSummary: "Make.com invoice paid webhook",
        triggeredBy: "worker_invoice_paid",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "invoicePaid",
          triggered_at: new Date().toISOString(),
          invoice_id: invoice?.id,
          invoice_number: invoice?.number ?? payload.number,
          amount: invoice?.amount,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "the amount";
        const subject = `Payment received — ${businessName}`;
        try {
          const rootDomain = getCanonicalRootDomain();
          const invoiceLink = buildInvoiceViewLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });
          const bookingLink = `https://${tenant?.slug}.${rootDomain}/booking`;
          const trackedReceiptLink = createTrackingUrl(invoiceLink, job.id, "View Receipt", rootDomain);
          const trackedBookingLink = createTrackingUrl(bookingLink, job.id, "Book Again", rootDomain);

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>✅ Your payment of <strong>${amount}</strong> to <strong>${businessName}</strong> has been received.</p>
              <p>Invoice: <strong>${invoice?.number ?? payload.number}</strong></p>
              <p>Thank you for your business — we look forward to working with you again!</p>
              ${buildActionSection(
                "📄 Receipt & Next Steps",
                "View your receipt or book your next service.",
                [
                  { label: "View Receipt", href: trackedReceiptLink, variant: "primary" },
                  { label: "Book Again", href: trackedBookingLink, variant: "success" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(
            brevoEmailCredentials,
            customer.email,
            subject,
            html
          );
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "email",
            subject,
            body: `Payment received for invoice ${invoice?.number ?? payload.number} (${amount}).`,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Payment receipt email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Receipt delivered",
            triggeredBy: "worker_invoice_paid"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "email",
            subject,
            body: `Payment received for invoice ${invoice?.number ?? payload.number} (${amount}).`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Payment receipt email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_invoice_paid"
          });
        }
      }
      break;
    }

    case "billing.payment_reminder": {
      const [brevoSmsCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "";
        const linkPart = invoice?.paymentLink ? ` Pay here: ${invoice.paymentLink}` : "";
        const smsBody = `Hi ${customer.firstName}, a friendly reminder that invoice ${invoice?.number ?? payload.number}${amount ? ` for ${amount}` : ""} from ${businessName} is still outstanding.${linkPart}`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "sms",
            subject: `Payment reminder · ${invoice?.number ?? payload.number}`,
            body: smsBody,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Payment reminder SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.number} reminder sent`,
            triggeredBy: "worker_payment_reminder"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            invoiceId: invoice?.id ?? payload.invoiceId,
            channel: "sms",
            subject: `Payment reminder · ${invoice?.number ?? payload.number}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Payment reminder SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_payment_reminder"
          });
        }
      }
      break;
    }

    case "retention.rebook_reminder": {
      const [brevoSmsCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}! It's ${businessName} — it's been a while since your last service. Would you like to book again? Reply or call us to schedule.`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: "Rebook reminder",
            body: smsBody,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Rebook reminder SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Rebook prompt delivered",
            triggeredBy: "worker_rebook_reminder"
          });

          if (payload.reminderId) {
            await prisma.rebookReminder.updateMany({
              where: { id: payload.reminderId },
              data: { status: "sent", sentAt: new Date() }
            });
          }
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: "Rebook reminder",
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Rebook reminder SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_rebook_reminder"
          });
        }
      }
      break;
    }

    case "retention.feedback_request": {
      const [brevoSmsCredentials, brevoEmailCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const feedbackLink = tenant?.slug ? buildFeedbackLink({
        tenantSlug: tenant.slug,
        tenantId,
        jobId: payload.jobId
      }) : null;

      if (customer?.email && feedbackLink) {
        const subject = `How did we do? Share your feedback`;
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Thank you for choosing <strong>${businessName}</strong>! We'd love to hear about your experience.</p>
              <p>Your feedback helps us improve and means the world to our team.</p>
              ${buildActionSection(
                "⭐ Share Your Feedback",
                "Tell us about your experience in just 2 minutes.",
                [
                  { label: "Leave Feedback", href: feedbackLink, variant: "success" },
                  { label: "Skip", href: `${feedbackLink}?skip=true`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: "Feedback request email",
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Feedback request email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Feedback request delivered",
            triggeredBy: "worker_feedback_request"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: "Feedback request email",
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Feedback request email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_feedback_request"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = feedbackLink
          ? `Hi ${customer.firstName}, how did we do? ${businessName} would love your feedback: ${feedbackLink}`
          : `Hi ${customer.firstName}, how did we do? ${businessName} would love your feedback — reply with a rating from 1-5 ⭐`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Feedback request · ${payload.jobId}`,
            body: smsBody,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Feedback request SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Feedback request delivered",
            triggeredBy: "worker_feedback_request"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Feedback request · ${payload.jobId}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Feedback request SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_feedback_request"
          });
        }
      }
      break;
    }

    case "retention.review_request": {
      const [brevoSmsCredentials, brevoEmailCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const reviewLink = payload.reviewLink ?? `https://google.com/search?q=${encodeURIComponent(businessName)}`;

      if (customer?.email) {
        const subject = `Help us improve — leave a review`;
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>We're thrilled you had a great experience with <strong>${businessName}</strong>!</p>
              <p>If you have a moment, a Google review would help other customers discover us and mean the world to our team.</p>
              ${buildActionSection(
                "⭐ Leave a Google Review",
                "Share your experience to help others make informed decisions.",
                [
                  { label: "Write Review", href: reviewLink, variant: "success" },
                  { label: "Maybe Later", href: `${reviewLink}?skip=true`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: "Review request email",
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Review request email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Review request delivered",
            triggeredBy: "worker_review_request"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: "Review request email",
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Review request email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_review_request"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, we're so glad you had a great experience with ${businessName}! If you have a moment, a Google review would mean the world to us 🌟`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Review request · ${payload.feedbackId ?? customer.id}`,
            body: smsBody,
            status: "sent"
          });

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Review request SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Review prompt delivered",
            triggeredBy: "worker_review_request"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId ?? null,
            channel: "sms",
            subject: `Review request · ${payload.feedbackId ?? customer.id}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Review request SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_review_request"
          });
        }
      }
      break;
    }

    case "enquiry.received": {
      const [makeCredentials, brevoEmailCredentials, brevoSmsCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const enquiryText = String(payload.serviceRequest ?? "New enquiry received");

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "enquiryWebhookUrl",
        requestSummary: "Make.com new enquiry webhook",
        triggeredBy: "worker_enquiry_received",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "newEnquiry",
          triggered_at: new Date().toISOString(),
          enquiry_id: payload.enquiryId,
          service_request: enquiryText,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const subject = `Enquiry received — ${businessName}`;
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Thanks for reaching out to <strong>${businessName}</strong>. We've received your enquiry and will review it shortly.</p>
              <p><strong>Your request:</strong> ${enquiryText}</p>
              <p>We'll be back in touch with next steps as soon as we can.</p>
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject,
            body: enquiryText,
            status: "sent"
          });
        } catch {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "email",
            subject,
            body: enquiryText,
            status: "failed"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, thanks for your enquiry with ${businessName}. We've received it and will get back to you soon.`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: "Enquiry received",
            body: smsBody,
            status: "sent"
          });
        } catch {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            channel: "sms",
            subject: "Enquiry received",
            body: smsBody,
            status: "failed"
          });
        }
      }

      if (tenant?.profile?.email) {
        const subject = `New enquiry from ${customer ? `${customer.firstName} ${customer.lastName}` : "a customer"}`;
        try {
          const tenantSlug = tenant?.slug ?? "";
          const dashboardUrl = `https://${tenantSlug}.${getCanonicalRootDomain()}/dashboard`;
          const crmCustomerUrl = customer ? `${dashboardUrl}/crm/customers/${customer.id}` : `${dashboardUrl}/crm`;

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>A new enquiry just landed in FlowLab.</p>
              <p><strong>Customer:</strong> ${customer ? `${customer.firstName} ${customer.lastName}` : "Unknown"}</p>
              <p><strong>Request:</strong> ${enquiryText}</p>
              ${buildActionSection(
                "💼 Ready to Quote?",
                "Create a quote and send it to the customer.",
                [
                  { label: "Create Quote", href: `${dashboardUrl}/quotes/new${customer ? `?enquiry=${payload.customerId}` : ""}`, variant: "success" },
                  { label: "View Customer", href: crmCustomerUrl, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, tenant.profile.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer?.id ?? null,
            channel: "email",
            subject,
            body: enquiryText,
            status: "sent"
          });
        } catch {
          await recordCommunication({
            tenantId,
            customerId: customer?.id ?? null,
            channel: "email",
            subject,
            body: enquiryText,
            status: "failed"
          });
        }
      }
      break;
    }

    case "job.scheduled": {
      const [makeCredentials, brevoEmailCredentials, brevoSmsCredentials, tenant, customer, jobRecord] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getJob(payload.jobId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const scheduledText = jobRecord?.scheduledFor
        ? new Date(jobRecord.scheduledFor).toLocaleString("en-AU")
        : "the scheduled time provided";

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "jobScheduledWebhookUrl",
        requestSummary: "Make.com job scheduled webhook",
        triggeredBy: "worker_job_scheduled",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "jobScheduled",
          triggered_at: new Date().toISOString(),
          job_id: payload.jobId,
          scheduled_for: jobRecord?.scheduledFor?.toISOString() ?? payload.scheduledFor,
          summary: jobRecord?.summary ?? payload.summary,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.email) {
        const subject = `Booking confirmed — ${businessName}`;
        try {
          const jobLink = buildFeedbackLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            jobId: payload.jobId
          }).replace("/feedback/", "/jobs/");

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Your job with <strong>${businessName}</strong> has been scheduled.</p>
              <p><strong>When:</strong> ${scheduledText}</p>
              <p><strong>Work:</strong> ${jobRecord?.summary ?? payload.summary ?? "Scheduled service"}</p>
              ${buildActionSection(
                "✅ Booking Confirmed",
                "Save this to your calendar. Contact us if you need to reschedule.",
                [
                  { label: "View Booking", href: jobLink, variant: "primary" },
                  { label: "Add to Calendar", href: `${jobLink}?action=calendar`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: `${jobRecord?.summary ?? payload.summary ?? "Scheduled service"} · ${scheduledText}`,
            status: "sent"
          });
        } catch {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: `${jobRecord?.summary ?? payload.summary ?? "Scheduled service"} · ${scheduledText}`,
            status: "failed"
          });
        }
      }

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, your job with ${businessName} is booked for ${scheduledText}.`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Job scheduled · ${payload.jobId}`,
            body: smsBody,
            status: "sent"
          });
        } catch {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Job scheduled · ${payload.jobId}`,
            body: smsBody,
            status: "failed"
          });
        }
      }
      break;
    }

    case "job.on_my_way": {
      const [makeCredentials, brevoSmsCredentials, tenant, customer, jobRecord] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getJob(payload.jobId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "onMyWayWebhookUrl",
        requestSummary: "Make.com on-my-way webhook",
        triggeredBy: "worker_on_my_way",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "onMyWay",
          triggered_at: new Date().toISOString(),
          job_id: payload.jobId,
          summary: jobRecord?.summary ?? payload.summary,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, ${businessName} is on the way to you now. We'll see you shortly!`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: "On my way",
            body: smsBody,
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `On my way SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "ETA SMS delivered",
            triggeredBy: "worker_on_my_way"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: "On my way",
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "On my way SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_on_my_way"
          });
        }
      }
      break;
    }

    case "job.complete": {
      const [brevoSmsCredentials, brevoEmailCredentials, tenant, customer, jobRecord] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getJob(payload.jobId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const feedbackLink = tenant?.slug ? buildFeedbackLink({
        tenantSlug: tenant.slug,
        tenantId,
        jobId: payload.jobId
      }) : null;

      if (customer?.email) {
        const subject = `Your job is complete — ${businessName}`;
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>We're pleased to let you know that your job with <strong>${businessName}</strong> is now complete.</p>
              <p><strong>Work completed:</strong> ${jobRecord?.summary ?? "Service completed"}</p>
              <p>If you have any questions or concerns, please don't hesitate to reach out.</p>
              <p>Thank you for choosing ${businessName}!</p>
              ${feedbackLink ? buildActionSection(
                "⭐ Share Your Feedback",
                "Your feedback helps us improve. Rate your experience and earn a $10 discount on your next service.",
                [{ label: "Leave Feedback (2 min)", href: feedbackLink, variant: "success" }]
              ) : ""}
              ${feedbackLink ? buildActionSection(
                "📱 View Job Details",
                "",
                [{ label: "View in Portal", href: `https://${tenant?.slug}.flowlabsolutions.au/jobs/${payload.jobId}`, variant: "secondary" }]
              ) : ""}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: `Job completed: ${jobRecord?.summary ?? "Service"}`,
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Job completion email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Completion notification delivered",
            triggeredBy: "worker_job_complete"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "email",
            subject,
            body: `Job completed: ${jobRecord?.summary ?? "Service"}`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Job completion email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_job_complete"
          });
        }
      }

      if (customer?.phone && feedbackLink) {
        const smsBody = `Hi ${customer.firstName}, your job with ${businessName} is complete. How did we do? ${feedbackLink}`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Job complete · ${payload.jobId}`,
            body: smsBody,
            status: "sent"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Job completion SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: "Completion notification delivered",
            triggeredBy: "worker_job_complete"
          });
        } catch (smsError) {
          await recordCommunication({
            tenantId,
            customerId: customer.id,
            jobId: payload.jobId,
            channel: "sms",
            subject: `Job complete · ${payload.jobId}`,
            body: smsBody,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Job completion SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_job_complete"
          });
        }
      }
      break;
    }

    case "schedule.recalculate": {
      const [makeCredentials, tenant] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId)
      ]);

      const recommendations = tenantId ? await getSchedulerRecommendations(tenantId) : [];
      const flagged = recommendations.filter((entry) => entry.severity !== "ok");

      if (flagged.length > 0) {
        await fireTenantMakeWebhook({
          tenantId,
          credentials: makeCredentials,
          webhookKey: "scheduleUpdateWebhookUrl",
          requestSummary: `Schedule update webhook: ${flagged.length} flagged jobs`,
          triggeredBy: "worker_schedule_recalculate",
          eventType: "info",
          payload: {
            tenant_slug: tenant?.slug,
            business_name: tenant?.profile?.businessName,
            event_key: "scheduleUpdate",
            triggered_at: new Date().toISOString(),
            flagged_count: flagged.length,
            recommendations: flagged.map((entry) => ({ severity: entry.severity, summary: entry.summary }))
          }
        });
      }

      await logPlatformEvent({
        tenantId,
        eventType: "api_call",
        service: "scheduler",
        direction: "outbound",
        status: "success",
        requestSummary: "Schedule recommendations generated",
        responseSummary: `${flagged.length} of ${recommendations.length} jobs need attention`,
        triggeredBy: "worker_schedule_recalculate"
      });
      break;
    }

    case "learning.weekly_analysis": {
      const tenant = await getTenantWithProfile(tenantId);
      const history = await prisma.timeEstimateHistory.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 30
      });

      if (history.length < 5) {
        await logPlatformEvent({
          tenantId,
          eventType: "info",
          service: "claude",
          direction: "outbound",
          status: "success",
          requestSummary: "Learning analysis skipped — insufficient history",
          responseSummary: `${history.length} records available (minimum 5 required)`,
          triggeredBy: "worker_learning_analysis"
        });
        break;
      }

      const pricingRate = await prisma.pricingRate.findFirst({ where: { tenantId } });

      if (!pricingRate) {
        break;
      }

      const avgVariance = history.reduce((sum, item) => sum + item.variancePct, 0) / history.length;
      const overEstimated = history.filter((item) => item.variancePct < -15).length;
      const underEstimated = history.filter((item) => item.variancePct > 15).length;

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const start = Date.now();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You are a field service business advisor for "${tenant?.profile?.businessName ?? "a business"}".

Analyse this job duration data and suggest pricing rate adjustments if needed:
- Total jobs analysed: ${history.length}
- Average variance: ${avgVariance.toFixed(1)}% (positive = ran over estimate, negative = ran under)
- Jobs that significantly over-ran (>15% variance): ${underEstimated}
- Jobs that significantly under-ran (<-15% variance): ${overEstimated}

Current rates:
- Standard: $${pricingRate.baseRatePerSquareM}/m²
- Overgrown: $${pricingRate.overgrownRate}/m²
- Heavily overgrown: $${pricingRate.heavilyOvergrownRate}/m²
- Minimum charge: $${pricingRate.minimumCharge}

Return a JSON array of suggested rate adjustments (only include rates that should change):
[
  {
    "field": "baseRatePerSquareM" | "overgrownRate" | "heavilyOvergrownRate" | "minimumCharge",
    "label": "human readable label",
    "current": number,
    "suggested": number,
    "reason": "brief explanation"
  }
]

Return an empty array [] if no changes are recommended. Return ONLY JSON, no markdown.`
          }
        ]
      });

      const durationMs = Date.now() - start;
      const rawText = response.content.find((block) => block.type === "text")?.text ?? "[]";
      const jsonText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

      let suggestions: Array<{ field: string; label: string; current: number; suggested: number; reason: string }> = [];
      try {
        suggestions = JSON.parse(jsonText);
      } catch {
        suggestions = [];
      }

      if (suggestions.length > 0) {
        await saveRateSuggestions(tenantId, suggestions);

        try {
          const brevoEmailCredentials = await getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE);
          const businessName = tenant?.profile?.businessName ?? "Your business";
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi there,</p>
              <p>Your FlowLab AI has analysed your last ${history.length} jobs and has <strong>${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}</strong> for updating your pricing rates.</p>
              <p>Average job duration variance: <strong>${avgVariance.toFixed(1)}%</strong></p>
              <p>Review and apply the suggestions in your <strong>Settings → Pricing</strong> page.</p>
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          if (tenant?.profile?.email) {
            await sendEmail(brevoEmailCredentials, tenant.profile.email, `AI pricing suggestions ready — ${businessName}`, html);
          }
        } catch {
          // Best-effort notification only.
        }
      }

      await logPlatformEvent({
        tenantId,
        eventType: "api_call",
        service: "claude",
        direction: "outbound",
        status: "success",
        durationMs,
        requestSummary: `Weekly learning analysis — ${history.length} jobs`,
        responseSummary: suggestions.length > 0 ? `${suggestions.length} rate adjustments suggested` : "No adjustments needed",
        triggeredBy: "worker_learning_analysis"
      });
      break;
    }

    case "operator.morning_digest": {
      const [brevoEmailCredentials, brevoSmsCredentials, tenant] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "FlowLab";
      const operatorEmail = tenant?.profile?.email ?? null;
      // Operator SMS goes to the business phone on the tenant profile (owner contact number)
      const operatorPhone = tenant?.profile?.phone ?? null;

      const tomorrowJobCount = Number(payload.tomorrowJobCount ?? "0");
      const overdueInvoiceCount = Number(payload.overdueInvoiceCount ?? "0");
      const openEnquiryCount = Number(payload.openEnquiryCount ?? "0");
      const pendingQuoteCount = Number(payload.pendingQuoteCount ?? "0");
      const recentFailedJobCount = Number(payload.recentFailedJobCount ?? "0");

      let tomorrowJobs: Array<{ summary: string; suburb: string; time: string; customer: string }> = [];
      let overdueInvoices: Array<{ number: string; amount: number; customer: string; daysOverdue: number }> = [];
      try { tomorrowJobs = JSON.parse(payload.tomorrowJobs ?? "[]"); } catch { /* ignore */ }
      try { overdueInvoices = JSON.parse(payload.overdueInvoices ?? "[]"); } catch { /* ignore */ }

      // ── SMS brief (short) ──────────────────────────────────────────────
      if (operatorPhone) {
        const smsParts: string[] = [`Good morning — here's your ${businessName} brief.`];
        if (tomorrowJobCount > 0) {
          smsParts.push(`Tomorrow: ${tomorrowJobCount} job${tomorrowJobCount === 1 ? "" : "s"}.`);
          tomorrowJobs.slice(0, 3).forEach((j) => smsParts.push(`  • ${j.customer} (${j.suburb}) @ ${j.time}`));
        } else {
          smsParts.push("Tomorrow: no jobs scheduled yet.");
        }
        if (overdueInvoiceCount > 0) smsParts.push(`Overdue invoices: ${overdueInvoiceCount}.`);
        if (openEnquiryCount > 0) smsParts.push(`New enquiries waiting: ${openEnquiryCount}.`);
        if (recentFailedJobCount > 0) smsParts.push(`⚠ ${recentFailedJobCount} automation failure${recentFailedJobCount === 1 ? "" : "s"} in last 24h.`);

        const smsBody = smsParts.join(" ");
        try {
          await sendSms(brevoSmsCredentials, operatorPhone, smsBody);
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: "Morning digest SMS sent to operator",
            responseSummary: `${tomorrowJobCount} jobs, ${overdueInvoiceCount} overdue invoices`,
            triggeredBy: "worker_morning_digest"
          });
        } catch (smsError) {
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Morning digest SMS failed",
            errorMessage: smsError instanceof Error ? smsError.message : String(smsError),
            triggeredBy: "worker_morning_digest"
          });
        }
      }

      // ── Email brief (detailed) ─────────────────────────────────────────
      if (operatorEmail) {
        const jobRows = tomorrowJobs.length > 0
          ? tomorrowJobs.map((j) => `<tr><td>${j.time}</td><td>${j.customer}</td><td>${j.suburb}</td><td>${j.summary}</td></tr>`).join("")
          : `<tr><td colspan="4" style="color:#94a3b8">No jobs scheduled for tomorrow yet.</td></tr>`;

        const invoiceRows = overdueInvoices.length > 0
          ? overdueInvoices.map((inv) => `<tr><td>${inv.number}</td><td>${inv.customer}</td><td>$${inv.amount}</td><td>${inv.daysOverdue}d overdue</td></tr>`).join("")
          : "";

        const alertsHtml = recentFailedJobCount > 0
          ? `<p style="color:#fca5a5">⚠ ${recentFailedJobCount} automation failure${recentFailedJobCount === 1 ? "" : "s"} in the last 24 hours — check System Health.</p>`
          : "";

        const tenantSlug = tenant?.slug ?? "";
        const dashboardUrl = `https://${tenantSlug}.${getCanonicalRootDomain()}/dashboard`;

        const actionButtons: Array<{ label: string; href: string; variant: "primary" | "success" | "danger" | "secondary" }> = [];
        if (tomorrowJobCount > 0) {
          actionButtons.push({ label: `📅 View Scheduler (${tomorrowJobCount} jobs)`, href: `${dashboardUrl}/scheduler`, variant: "primary" });
        }
        if (overdueInvoiceCount > 0) {
          actionButtons.push({ label: `💰 Collect Payment (${overdueInvoiceCount} overdue)`, href: `${dashboardUrl}/invoices?status=overdue`, variant: "danger" });
        }
        if (openEnquiryCount > 0) {
          actionButtons.push({ label: `📬 Review Enquiries (${openEnquiryCount})`, href: `${dashboardUrl}/crm/enquiries`, variant: "primary" });
        }
        if (recentFailedJobCount > 0) {
          actionButtons.push({ label: `⚠️ Check System Health`, href: `${dashboardUrl}/system-health`, variant: "danger" });
        }

        const bodyHtml = `
          <p>Good morning. Here's your daily brief for <strong>${businessName}</strong>.</p>
          ${alertsHtml}
          <h3 style="margin-top:24px">Tomorrow's run sheet (${tomorrowJobCount} job${tomorrowJobCount === 1 ? "" : "s"})</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead><tr style="color:#94a3b8"><th align="left">Time</th><th align="left">Customer</th><th align="left">Suburb</th><th align="left">Job</th></tr></thead>
            <tbody>${jobRows}</tbody>
          </table>
          ${overdueInvoices.length > 0 ? `
          <h3 style="margin-top:24px">Overdue invoices (${overdueInvoiceCount})</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead><tr style="color:#94a3b8"><th align="left">Invoice</th><th align="left">Customer</th><th align="left">Amount</th><th align="left">Status</th></tr></thead>
            <tbody>${invoiceRows}</tbody>
          </table>` : ""}
          ${openEnquiryCount > 0 ? `<p style="margin-top:16px">${openEnquiryCount} new enquir${openEnquiryCount === 1 ? "y" : "ies"} waiting in your CRM.</p>` : ""}
          ${pendingQuoteCount > 0 ? `<p>${pendingQuoteCount} quote${pendingQuoteCount === 1 ? "" : "s"} sitting in draft — worth reviewing before the day starts.</p>` : ""}
          ${actionButtons.length > 0 ? buildActionSection("🚀 Quick Actions", "Jump directly to the areas that need your attention.", actionButtons) : ""}
        `;

        const html = buildBrandedEmailHtml({
          businessName,
          logoUrl: tenant?.profile?.logoUrl,
          primaryColour: tenant?.profile?.primaryColour,
          bodyHtml,
          footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
        });

        try {
          await sendEmail(brevoEmailCredentials, operatorEmail, `Daily brief — ${businessName}`, html);
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: "Morning digest email sent to operator",
            responseSummary: `${tomorrowJobCount} jobs, ${overdueInvoiceCount} overdue invoices`,
            triggeredBy: "worker_morning_digest"
          });
        } catch (emailError) {
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Morning digest email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_morning_digest"
          });
        }
      }

      // ── Make.com webhook ──────────────────────────────────────────────
      const makeCredentials = await getCredentials(tenantId, "make_com");
      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "morningDigestWebhookUrl",
        requestSummary: "Make.com morning digest webhook",
        triggeredBy: "worker_morning_digest",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "morningDigest",
          triggered_at: new Date().toISOString(),
          tomorrow_job_count: tomorrowJobCount,
          overdue_invoice_count: overdueInvoiceCount,
          open_enquiry_count: openEnquiryCount,
          pending_quote_count: pendingQuoteCount,
          failed_automation_count: recentFailedJobCount
        }
      });

      break;
    }

    case "billing.trial_expired": {
      const tenant = await getTenantWithProfile(tenantId);
      if (!tenant) break;

      // Idempotency: only act if still in trial status
      if (tenant.status !== "trial") break;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: "suspended" }
      });

      await logPlatformEvent({
        tenantId,
        eventType: "info",
        service: "worker",
        direction: "outbound",
        status: "success",
        requestSummary: "Trial expired — tenant suspended",
        responseSummary: `${tenant.profile?.businessName ?? tenant.slug} transitioned to suspended`,
        triggeredBy: "worker_trial_expiry"
      });

      // Send billing email to the operator
      if (tenant.billingEmail) {
        const businessName = tenant.profile?.businessName ?? tenant.slug;
        const subject = `Your FlowLab trial has ended — ${businessName}`;
        const html = buildBrandedEmailHtml({
          businessName: "FlowLab",
          bodyHtml: `
            <p>Hi ${businessName},</p>
            <p>Your 14-day free trial has ended and your account has been temporarily suspended.</p>
            <p>To continue using FlowLab and keep all your automations, data, and integrations running,
            please upgrade to a paid plan.</p>
            <p>Reply to this email or log in to your dashboard to upgrade.</p>
            <p>If you have any questions, we're happy to help.</p>
          `,
          footerText: "FlowLab Solutions"
        });

        try {
          // Pass empty credentials — sendEmail falls back to BREVO_* env vars
          await sendEmail({}, tenant.billingEmail, subject, html);
          await recordCommunication({
            tenantId,
            channel: "email",
            subject,
            body: `Trial expired — account suspended. Upgrade email sent to ${tenant.billingEmail}.`,
            status: "sent"
          });
        } catch (emailError) {
          await recordCommunication({
            tenantId,
            channel: "email",
            subject,
            body: `Trial expired — account suspended. Upgrade email failed to send.`,
            status: "failed"
          });
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Trial expiry billing email failed",
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
            triggeredBy: "worker_trial_expiry"
          });
        }
      }

      break;
    }

    case "job.day_before_reminder": {
      const [brevoEmailCredentials, brevoSmsCredentials, makeCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const scheduledText = payload.scheduledFor
        ? new Date(payload.scheduledFor).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })
        : "tomorrow";

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "dayBeforeReminderWebhookUrl",
        requestSummary: "Make.com day-before reminder webhook",
        triggeredBy: "worker_day_before_reminder",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "dayBeforeReminder",
          triggered_at: new Date().toISOString(),
          job_id: payload.jobId,
          scheduled_for: payload.scheduledFor,
          summary: payload.summary,
          suburb: payload.suburb,
          customer: {
            id: customer?.id,
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
            phone: customer?.phone,
            email: customer?.email
          }
        }
      });

      if (customer?.phone) {
        const smsBody = `Hi ${customer.firstName}, just a reminder that your ${payload.summary ? `${payload.summary} ` : ""}job with ${businessName} is booked for ${scheduledText}. See you then!`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({ tenantId, customerId: customer.id, jobId: payload.jobId, channel: "sms", subject: `Day-before reminder · ${payload.jobId}`, body: smsBody, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-before SMS to ${customer.firstName} ${customer.lastName}`, responseSummary: "Reminder delivered", triggeredBy: "worker_day_before_reminder" });
        } catch (smsError) {
          await recordCommunication({ tenantId, customerId: customer.id, jobId: payload.jobId, channel: "sms", subject: `Day-before reminder · ${payload.jobId}`, body: smsBody, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-before SMS failed", errorMessage: smsError instanceof Error ? smsError.message : String(smsError), triggeredBy: "worker_day_before_reminder" });
        }
      }

      if (customer?.email) {
        const subject = `Reminder: your job with ${businessName} is tomorrow`;
        try {
          const jobLink = buildFeedbackLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            jobId: payload.jobId
          }).replace("/feedback/", "/jobs/");

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Just a friendly reminder that your job with <strong>${businessName}</strong> is coming up.</p>
              <p><strong>When:</strong> ${scheduledText}</p>
              <p><strong>Work:</strong> ${payload.summary ?? "Scheduled service"}</p>
              ${payload.suburb ? `<p><strong>Location:</strong> ${payload.suburb}</p>` : ""}
              ${buildActionSection(
                "📅 Job Confirmed?",
                "View your job details or contact us to reschedule.",
                [
                  { label: "View Job", href: jobLink, variant: "primary" },
                  { label: "Contact Us", href: `https://${tenant?.slug}.${getCanonicalRootDomain()}/contact`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });
          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({ tenantId, customerId: customer.id, jobId: payload.jobId, channel: "email", subject, body: `Reminder for ${scheduledText}`, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-before email to ${customer.firstName} ${customer.lastName}`, responseSummary: "Reminder delivered", triggeredBy: "worker_day_before_reminder" });
        } catch (emailError) {
          await recordCommunication({ tenantId, customerId: customer.id, jobId: payload.jobId, channel: "email", subject, body: `Reminder for ${scheduledText}`, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-before email failed", errorMessage: emailError instanceof Error ? emailError.message : String(emailError), triggeredBy: "worker_day_before_reminder" });
        }
      }
      break;
    }


    case "billing.payment_reminder_day3": {
      const [brevoSmsCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "";
        const linkPart = invoice?.paymentLink ? ` Pay now: ${invoice.paymentLink}` : "";
        const smsBody = `Hi ${customer.firstName}, a reminder that invoice ${invoice?.number ?? payload.number}${amount ? ` for ${amount}` : ""} from ${businessName} is overdue.${linkPart}`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment reminder day 3 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-3 payment reminder to ${customer.firstName} ${customer.lastName}`, responseSummary: `Invoice ${invoice?.number ?? payload.number} day-3 reminder sent`, triggeredBy: "worker_payment_reminder_day3" });
        } catch (smsError) {
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment reminder day 3 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-3 payment reminder SMS failed", errorMessage: smsError instanceof Error ? smsError.message : String(smsError), triggeredBy: "worker_payment_reminder_day3" });
        }
      }
      break;
    }

    case "billing.payment_reminder_day7": {
      const [brevoEmailCredentials, brevoSmsCredentials, makeCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "";

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "paymentReminderDay7WebhookUrl",
        requestSummary: "Make.com day-7 payment reminder webhook",
        triggeredBy: "worker_payment_reminder_day7",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "paymentReminderDay7",
          triggered_at: new Date().toISOString(),
          invoice_id: invoice?.id,
          invoice_number: invoice?.number ?? payload.number,
          amount: invoice?.amount,
          days_overdue: payload.daysOverdue,
          payment_link: invoice?.paymentLink,
          customer: { id: customer?.id, name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer", phone: customer?.phone, email: customer?.email }
        }
      });

      if (customer?.phone) {
        const linkPart = invoice?.paymentLink ? ` Pay now: ${invoice.paymentLink}` : "";
        const smsBody = `Hi ${customer.firstName}, your invoice ${invoice?.number ?? payload.number}${amount ? ` for ${amount}` : ""} from ${businessName} is now 7 days overdue. Please settle this at your earliest convenience.${linkPart}`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment reminder day 7 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-7 payment reminder SMS to ${customer.firstName} ${customer.lastName}`, responseSummary: `Invoice ${invoice?.number ?? payload.number} day-7 reminder sent`, triggeredBy: "worker_payment_reminder_day7" });
        } catch (smsError) {
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment reminder day 7 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-7 payment reminder SMS failed", errorMessage: smsError instanceof Error ? smsError.message : String(smsError), triggeredBy: "worker_payment_reminder_day7" });
        }
      }

      if (customer?.email) {
        const subject = `Invoice overdue — ${businessName}`;
        try {
          const invoiceLink = buildInvoiceViewLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });
          const paymentLink = invoice?.paymentLink ?? buildInvoicePaymentLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Your invoice <strong>${invoice?.number ?? payload.number}</strong>${amount ? ` for <strong>${amount}</strong>` : ""} from <strong>${businessName}</strong> is now <strong>7 days overdue</strong>.</p>
              <p>Please arrange payment at your earliest convenience to avoid further follow-up.</p>
              ${buildActionSection(
                "⚠️ Payment Required",
                "Please settle this invoice now to avoid suspension of services.",
                [
                  { label: "Pay Now", href: paymentLink, variant: "danger" },
                  { label: "View Invoice", href: invoiceLink, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });
          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "email", subject, body: `Invoice ${invoice?.number ?? payload.number} overdue 7 days.`, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-7 overdue email to ${customer.firstName} ${customer.lastName}`, responseSummary: "Overdue notice delivered", triggeredBy: "worker_payment_reminder_day7" });
        } catch (emailError) {
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "email", subject, body: `Invoice ${invoice?.number ?? payload.number} overdue 7 days.`, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-7 overdue email failed", errorMessage: emailError instanceof Error ? emailError.message : String(emailError), triggeredBy: "worker_payment_reminder_day7" });
        }
      }
      break;
    }

    case "billing.payment_overdue_day14": {
      const [brevoEmailCredentials, brevoSmsCredentials, makeCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getCredentials(tenantId, BREVO_SMS_INTEGRATION_SERVICE),
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "";

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "paymentOverdueDay14WebhookUrl",
        requestSummary: "Make.com day-14 payment overdue webhook",
        triggeredBy: "worker_payment_overdue_day14",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: businessName,
          event_key: "paymentOverdueDay14",
          triggered_at: new Date().toISOString(),
          invoice_id: invoice?.id,
          invoice_number: invoice?.number ?? payload.number,
          amount: invoice?.amount,
          days_overdue: payload.daysOverdue,
          payment_link: invoice?.paymentLink,
          customer: { id: customer?.id, name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer", phone: customer?.phone, email: customer?.email }
        }
      });

      // Final notice SMS to customer
      if (customer?.phone) {
        const linkPart = invoice?.paymentLink ? ` Pay now: ${invoice.paymentLink}` : "";
        const smsBody = `Hi ${customer.firstName}, invoice ${invoice?.number ?? payload.number}${amount ? ` for ${amount}` : ""} from ${businessName} is now 14 days overdue. Please contact us urgently to arrange payment.${linkPart}`;
        try {
          await sendSms(brevoSmsCredentials, customer.phone, smsBody);
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment overdue day 14 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-14 overdue SMS to ${customer.firstName} ${customer.lastName}`, responseSummary: `Invoice ${invoice?.number ?? payload.number} final notice sent`, triggeredBy: "worker_payment_overdue_day14" });
        } catch (smsError) {
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "sms", subject: `Payment overdue day 14 · ${invoice?.number ?? payload.number}`, body: smsBody, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: SMS_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-14 overdue SMS failed", errorMessage: smsError instanceof Error ? smsError.message : String(smsError), triggeredBy: "worker_payment_overdue_day14" });
        }
      }

      // Escalation email to customer + operator alert
      if (customer?.email) {
        const subject = `Final notice: invoice overdue — ${businessName}`;
        try {
          const invoiceLink = buildInvoiceViewLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });
          const paymentLink = invoice?.paymentLink ?? buildInvoicePaymentLink({
            tenantSlug: tenant?.slug ?? "",
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Your invoice <strong>${invoice?.number ?? payload.number}</strong>${amount ? ` for <strong>${amount}</strong>` : ""} from <strong>${businessName}</strong> is now <strong>14 days overdue</strong>.</p>
              <p>This is a final notice. Please arrange payment immediately or contact us to discuss a resolution.</p>
              ${buildActionSection(
                "🚨 URGENT: Payment Required Now",
                "Immediate action needed to avoid service suspension.",
                [
                  { label: "Pay Immediately", href: paymentLink, variant: "danger" },
                  { label: "Contact Support", href: `https://${tenant?.slug}.${getCanonicalRootDomain()}/support`, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });
          await sendEmail(brevoEmailCredentials, customer.email, subject, html);
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "email", subject, body: `Final notice: invoice ${invoice?.number ?? payload.number} 14 days overdue.`, status: "sent" });
          await logPlatformEvent({ tenantId, eventType: "api_call", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "success", requestSummary: `Day-14 final notice email to ${customer.firstName} ${customer.lastName}`, responseSummary: "Final notice delivered", triggeredBy: "worker_payment_overdue_day14" });
        } catch (emailError) {
          await recordCommunication({ tenantId, customerId: customer.id, invoiceId: invoice?.id ?? payload.invoiceId, channel: "email", subject, body: `Final notice: invoice ${invoice?.number ?? payload.number} 14 days overdue.`, status: "failed" });
          await logPlatformEvent({ tenantId, eventType: "error", service: EMAIL_PROVIDER_SERVICE, direction: "outbound", status: "failed", requestSummary: "Day-14 final notice email failed", errorMessage: emailError instanceof Error ? emailError.message : String(emailError), triggeredBy: "worker_payment_overdue_day14" });
        }
      }

      // Operator alert email
      if (tenant?.profile?.email) {
        const operatorSubject = `⚠ Invoice ${invoice?.number ?? payload.number} is 14 days overdue`;
        try {
          const tenantSlug = tenant?.slug ?? "";
          const dashboardUrl = `https://${tenantSlug}.${getCanonicalRootDomain()}/dashboard`;
          const invoiceLink = buildInvoiceViewLink({
            tenantSlug,
            tenantId,
            invoiceId: invoice?.id ?? payload.invoiceId
          });
          const customerLink = customer ? `${dashboardUrl}/crm/customers/${customer.id}` : `${dashboardUrl}/crm`;

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant.profile.logoUrl,
            primaryColour: tenant.profile.primaryColour,
            bodyHtml: `
              <p>Invoice <strong>${invoice?.number ?? payload.number}</strong>${amount ? ` for <strong>${amount}</strong>` : ""} from customer <strong>${customer ? `${customer.firstName} ${customer.lastName}` : "Unknown"}</strong> is now <strong>14 days overdue</strong>.</p>
              <p>A final notice has been sent to the customer. You may want to follow up directly to arrange payment or discuss the situation.</p>
              ${buildActionSection(
                "⚠️ Immediate Action Needed",
                "Contact the customer directly to collect this payment.",
                [
                  { label: "View Invoice", href: invoiceLink, variant: "danger" },
                  { label: "Contact Customer", href: customerLink, variant: "primary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });
          await sendEmail(brevoEmailCredentials, tenant.profile.email, operatorSubject, html);
        } catch {
          // Best-effort operator alert — don't fail the job if this send fails.
        }
      }
      break;
    }

    case "learning.weather_check": {
      const [makeCredentials, tenant] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId)
      ]);

      const timeZone = tenant?.profile?.timezone ?? "Australia/Brisbane";
      const now = new Date();
      const tomorrowJobs = await prisma.job.findMany({
        where: {
          tenantId,
          status: { in: ["scheduled", "in_progress"] },
          scheduledFor: {
            gte: now,
            lt: new Date(now.getTime() + 48 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          scheduledFor: true,
          suburb: true,
          address: true,
          summary: true,
          weatherRisk: true
        }
      });

      if (tomorrowJobs.length === 0) {
        await logPlatformEvent({
          tenantId,
          eventType: "info",
          service: "worker",
          direction: "outbound",
          status: "success",
          requestSummary: "Weather check skipped — no jobs tomorrow",
          responseSummary: null,
          triggeredBy: "worker_weather_check"
        });
        break;
      }

      const jobLocations = tomorrowJobs.map((j) => ({
        job_id: j.id,
        scheduled_for: j.scheduledFor?.toISOString(),
        suburb: j.suburb ?? null,
        address: j.address ?? null,
        summary: j.summary,
        weather_risk_flagged: j.weatherRisk
      }));

      await fireTenantMakeWebhook({
        tenantId,
        credentials: makeCredentials,
        webhookKey: "weatherCheckWebhookUrl",
        requestSummary: `Weather check webhook — ${tomorrowJobs.length} jobs tomorrow`,
        triggeredBy: "worker_weather_check",
        eventType: "info",
        payload: {
          tenant_slug: tenant?.slug,
          business_name: tenant?.profile?.businessName,
          event_key: "weatherCheck",
          triggered_at: new Date().toISOString(),
          time_zone: timeZone,
          job_count: tomorrowJobs.length,
          jobs: jobLocations
        }
      });

      await logPlatformEvent({
        tenantId,
        eventType: "info",
        service: "worker",
        direction: "outbound",
        status: "success",
        requestSummary: `Weather check queued for ${tomorrowJobs.length} jobs`,
        responseSummary: jobLocations.map((j) => j.suburb ?? j.address ?? "unknown").join(", ").slice(0, 200),
        triggeredBy: "worker_weather_check"
      });
      break;
    }

    case "xero.invoice_synced": {
      const [brevoEmailCredentials, tenant, invoice] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId),
        prisma.invoice.findUnique({
          where: { id: payload.invoiceId },
          include: { customer: true }
        })
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your business";

      // Operator notification: invoice synced to Xero
      if (tenant?.profile?.email && invoice) {
        const subject = `✅ Invoice synced to Xero — ${payload.number}`;
        try {
          const rootDomain = getCanonicalRootDomain();
          const tenantSlug = tenant?.slug ?? "";
          const dashboardUrl = `https://${tenantSlug}.${rootDomain}/dashboard`;
          const invoiceLink = `${dashboardUrl}/invoices/${invoice.id}`;
          const xeroLink = `https://go.xero.com/organisation/invoices/${payload.xeroInvoiceId}`;
          const trackedInvoiceLink = createTrackingUrl(invoiceLink, job.id, "View in FlowLab", rootDomain);
          const trackedXeroLink = createTrackingUrl(xeroLink, job.id, "View in Xero", rootDomain);

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Invoice <strong>${payload.number}</strong> has been successfully synced to Xero.</p>
              <p><strong>Customer:</strong> ${invoice.customer?.firstName} ${invoice.customer?.lastName}</p>
              <p><strong>Amount:</strong> $${invoice.amount?.toFixed(2)}</p>
              ${buildActionSection(
                "📋 Xero Sync Complete",
                "The invoice is now in your Xero account and ready for payment tracking.",
                [
                  { label: "View in FlowLab", href: trackedInvoiceLink, variant: "primary" },
                  { label: "View in Xero", href: trackedXeroLink, variant: "secondary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, tenant.profile.email, subject, html);
          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Xero invoice sync notification for ${payload.number}`,
            responseSummary: "Sync confirmation sent",
            triggeredBy: "worker_xero_invoice_synced"
          });
        } catch (err) {
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Xero invoice sync notification failed",
            errorMessage: err instanceof Error ? err.message : String(err),
            triggeredBy: "worker_xero_invoice_synced"
          });
        }
      }
      break;
    }

    case "xero.sync_error": {
      const [brevoEmailCredentials, tenant] = await Promise.all([
        getCredentials(tenantId, BREVO_EMAIL_INTEGRATION_SERVICE),
        getTenantWithProfile(tenantId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your business";

      // Operator alert: sync error
      if (tenant?.profile?.email) {
        const subject = `⚠️ Xero Sync Failed — Invoice ${payload.number ?? ""}`;
        try {
          const tenantSlug = tenant?.slug ?? "";
          const dashboardUrl = `https://${tenantSlug}.${getCanonicalRootDomain()}/dashboard`;
          const systemHealthLink = `${dashboardUrl}/system-health`;

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>An error occurred while syncing an invoice to Xero.</p>
              <p><strong>Invoice ID:</strong> ${payload.invoiceId}</p>
              <p><strong>Error:</strong> <code>${payload.errorMessage || "Unknown error"}</code></p>
              <p>Please check your Xero connection and try syncing again.</p>
              ${buildActionSection(
                "🔧 Troubleshoot",
                "Review the error and check your Xero credentials.",
                [
                  { label: "View Error Details", href: systemHealthLink, variant: "danger" },
                  { label: "Check Integrations", href: `${dashboardUrl}/integrations/xero`, variant: "primary" }
                ]
              )}
            `,
            footerText: buildTenantSignatureFooter(tenant?.profile, businessName)
          });

          await sendEmail(brevoEmailCredentials, tenant.profile.email, subject, html);
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: "xero",
            direction: "outbound",
            status: "success",
            requestSummary: "Xero sync error notification sent",
            responseSummary: `Error: ${payload.errorMessage || "Unknown"}`,
            triggeredBy: "worker_xero_sync_error"
          });
        } catch (err) {
          await logPlatformEvent({
            tenantId,
            eventType: "error",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "failed",
            requestSummary: "Xero sync error notification failed",
            errorMessage: err instanceof Error ? err.message : String(err),
            triggeredBy: "worker_xero_sync_error"
          });
        }
      }
      break;
    }

    default: {
      await logPlatformEvent({
        tenantId,
        eventType: "info",
        service: "worker",
        direction: "outbound",
        status: "success",
        requestSummary: `No-op automation for ${job.kind}`,
        responseSummary: "Job acknowledged",
        triggeredBy: "worker_default_handler"
      });
    }
  }
}

export async function processAutomationBatch(limit = 25) {
  await enqueueRecurringAutomationJobs();
  const jobs = await claimPendingAutomationJobs(limit);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(job);
      await completeAutomationJob(job.id);
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker error";
      const failedJob = await failAutomationJob(job.id, message);

      await logPlatformEvent({
        tenantId: job.tenantId ?? null,
        eventType: failedJob.status === "dead_letter" ? "error" : "warning",
        service: "worker",
        direction: "outbound",
        status: failedJob.status === "dead_letter" ? "failed" : "pending",
        requestSummary: `Automation ${job.kind} ${failedJob.status === "dead_letter" ? "dead-lettered" : "scheduled for retry"}`,
        responseSummary: failedJob.status === "dead_letter" ? null : `Retry ${failedJob.attempts}/${5} queued`,
        errorMessage: message,
        triggeredBy: "worker_retry_manager"
      });

      if (failedJob.status === "dead_letter") {
        // Structured alert for log-based monitoring (grep: AUTOMATION_TERMINAL_FAILURE)
        logger.error("Automation reached dead-letter queue", {
          alert: "AUTOMATION_TERMINAL_FAILURE",
          jobId: job.id,
          kind: job.kind,
          tenantId: job.tenantId,
          attempts: failedJob.attempts,
          errorMessage: message,
          service: "worker"
        });

        // Email operator alert
        if (job.tenantId) {
          try {
            const tenant = await prisma.tenant.findUnique({
              where: { id: job.tenantId },
              include: { profile: true }
            });

            if (tenant?.billingEmail) {
              const brevoEmailCredentials = await getCredentials(job.tenantId, BREVO_EMAIL_INTEGRATION_SERVICE);
              const businessName = tenant.profile?.businessName ?? tenant.slug ?? "Your business";
              const html = buildBrandedEmailHtml({
                businessName: "FlowLab",
                bodyHtml: `
                  <p>Hi ${businessName},</p>
                  <p>⚠️ <strong>An automated notification failed after 5 retry attempts.</strong></p>
                  <p><strong>Issue:</strong> ${job.kind}</p>
                  <p><strong>Error:</strong> ${message}</p>
                  <p>This automation is no longer running. Please check your integration settings and re-enable this automation from your dashboard.</p>
                  <p>If you need help, please contact support.</p>
                `,
                footerText: "FlowLab Solutions"
              });

              await sendEmail(brevoEmailCredentials, tenant.billingEmail, `⚠️ Automation Alert: ${job.kind} Failed`, html);
            }
          } catch (alertError) {
            logger.error("Failed to send operator alert for dead-letter job", {
              jobId: job.id,
              kind: job.kind,
              tenantId: job.tenantId,
              error: alertError instanceof Error ? alertError.message : String(alertError)
            });
          }
        }
      }

      failed += 1;
    }
  }

  return {
    claimed: jobs.length,
    completed,
    failed
  };
}

export async function logWorkerBoot() {
  const tenants = await prisma.tenant.findMany({
    include: { integrations: true }
  });

  logger.info("FlowLab worker online", {
    service: "worker",
    tenantCount: tenants.length
  });

  await Promise.all(
    tenants.map((tenant) =>
      logPlatformEvent({
        tenantId: tenant.id,
        eventType: "info",
        service: "worker",
        direction: "outbound",
        status: "success",
        requestSummary: "Worker heartbeat",
        responseSummary: `${tenant.integrations.length} integrations tracked`,
        triggeredBy: "worker_boot"
      })
    )
  );

  return tenants.length;
}

export async function startAutomationWorker(options?: { pollMs?: number; runOnce?: boolean }) {
  const pollMs = options?.pollMs ?? 5000;
  const runOnce = options?.runOnce ?? false;
  const heartbeatIntervalMs = 60_000; // 1 minute
  let lastHeartbeatAt = 0;

  await logWorkerBoot();

  do {
    const result = await processAutomationBatch(25);
    logger.info("Automation batch processed", {
      service: "worker",
      event: "batch_processed",
      claimed: result.claimed,
      completed: result.completed,
      failed: result.failed,
    });

    // Periodic heartbeat — write a platform event every ~60 s
    const now = Date.now();
    if (now - lastHeartbeatAt >= heartbeatIntervalMs) {
      lastHeartbeatAt = now;
      await logPlatformEvent({
        tenantId: null,
        eventType: "info",
        service: "worker",
        direction: "outbound",
        status: "success",
        requestSummary: "Worker heartbeat",
        responseSummary: null,
        triggeredBy: "worker_heartbeat"
      });
    }

    if (runOnce) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);
}
