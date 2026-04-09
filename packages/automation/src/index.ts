import { signCustomerToken } from "@flowlab/auth";
import { getCanonicalRootDomain } from "@flowlab/contracts/server";
import {
  claimPendingAutomationJobs,
  completeAutomationJob,
  failAutomationJob,
  getPendingRateSuggestions,
  getSchedulerRecommendations,
  getTenantIntegrationRecord,
  prisma,
  saveRateSuggestions
} from "@flowlab/db";
import { logPlatformEvent } from "@flowlab/events";
import {
  buildBrandedEmailHtml,
  decryptJson,
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

async function getCredentials(tenantId: string, service: "twilio" | "sendgrid" | "make_com") {
  const record = await getTenantIntegrationRecord(tenantId, service);
  return record?.credentialsJson ? decryptJson(record.credentialsJson) : {};
}

async function processJob(job: ClaimedJob) {
  const payload = job.payload as Record<string, string>;
  const tenantId = job.tenantId ?? "";

  switch (job.kind) {
    case "quote.accepted": {
      const [makeCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const makeResult = await fireMakeWebhook(makeCredentials, "quoteAcceptedWebhookUrl", {
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
      });

      await logPlatformEvent({
        tenantId,
        eventType: "webhook_fired",
        service: "make",
        direction: "outbound",
        status: makeResult.ok ? "success" : makeResult.status === 0 ? "pending" : "failed",
        requestSummary: "Make.com quote accepted webhook",
        responseSummary: makeResult.body.slice(0, 200),
        triggeredBy: "worker_quote_accepted"
      });

      if (customer?.phone) {
        try {
          const twilioCredentials = await getCredentials(tenantId, "twilio");
          await sendSms(
            twilioCredentials,
            customer.phone,
            `Hi ${customer.firstName}, thanks for accepting your quote from ${businessName}. Your service agreement will arrive shortly — please check your email.`
          );
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
      const [makeCredentials, sendgridCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, "sendgrid"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const makeResult = await fireMakeWebhook(makeCredentials, "agreementSignedWebhookUrl", {
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
      });

      await logPlatformEvent({
        tenantId,
        eventType: "webhook_fired",
        service: "make",
        direction: "outbound",
        status: makeResult.ok ? "success" : makeResult.status === 0 ? "pending" : "failed",
        requestSummary: "Make.com agreement signed webhook",
        responseSummary: makeResult.body.slice(0, 200),
        triggeredBy: "worker_agreement_signed"
      });

      if (customer?.email) {
        try {
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>Your service agreement with <strong>${businessName}</strong> has been signed successfully.</p>
              <p>Agreement: <strong>${payload.title}</strong></p>
              <p>We'll be in touch shortly to confirm your booking details.</p>
              <p>Thanks for choosing ${businessName}!</p>
            `,
            footerText: `${businessName} | ${tenant?.profile?.phone ?? ""} | ${tenant?.profile?.email ?? ""}`
          });

          await sendEmail(
            sendgridCredentials,
            customer.email,
            `Agreement signed — ${businessName}`,
            html
          );

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
      const [makeCredentials, sendgridCredentials, twilioCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, "sendgrid"),
        getCredentials(tenantId, "twilio"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "an amount";
      const paymentLink = invoice?.paymentLink ?? null;
      const makeResult = await fireMakeWebhook(makeCredentials, "jobCompleteWebhookUrl", {
        tenant_slug: tenant?.slug,
        business_name: businessName,
        event_key: "invoiceCreated",
        triggered_at: new Date().toISOString(),
        invoice_id: invoice?.id,
        invoice_number: invoice?.number ?? payload.invoiceNumber,
        amount: invoice?.amount,
        payment_link: paymentLink,
        customer: {
          id: customer?.id,
          name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
          phone: customer?.phone,
          email: customer?.email
        }
      });

      await logPlatformEvent({
        tenantId,
        eventType: "webhook_fired",
        service: "make",
        direction: "outbound",
        status: makeResult.ok ? "success" : makeResult.status === 0 ? "pending" : "failed",
        requestSummary: "Make.com invoice created webhook",
        responseSummary: makeResult.body.slice(0, 200),
        triggeredBy: "worker_invoice_created"
      });

      if (customer?.email) {
        try {
          const payButton = paymentLink
            ? `<p style="margin-top:24px;"><a href="${paymentLink}" style="background:${tenant?.profile?.primaryColour ?? "#3B82F6"};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Pay Invoice ${amount}</a></p>`
            : `<p>Invoice amount: <strong>${amount}</strong></p>`;

          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer?.firstName ?? "there"},</p>
              <p>Your invoice from <strong>${businessName}</strong> is ready.</p>
              <p>Invoice number: <strong>${invoice?.number ?? payload.invoiceNumber}</strong></p>
              ${payButton}
              <p style="margin-top:16px;color:#64748b;font-size:13px;">Payment is due within 7 days. Thank you!</p>
            `,
            footerText: `${businessName} | ${tenant?.profile?.phone ?? ""} | ${tenant?.profile?.email ?? ""}`
          });

          await sendEmail(
            sendgridCredentials,
            customer.email,
            `Invoice ${invoice?.number ?? payload.invoiceNumber} from ${businessName}`,
            html
          );

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: EMAIL_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Invoice email to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.invoiceNumber} sent`,
            triggeredBy: "worker_invoice_created"
          });
        } catch (emailError) {
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
        try {
          const smsBody = paymentLink
            ? `Hi ${customer?.firstName ?? "there"}, your invoice for ${amount} from ${businessName} is ready. Pay here: ${paymentLink}`
            : `Hi ${customer?.firstName ?? "there"}, your invoice ${invoice?.number ?? payload.invoiceNumber} for ${amount} from ${businessName} is ready. Check your email to pay.`;

          await sendSms(twilioCredentials, customer.phone, smsBody);

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Invoice SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.invoiceNumber} SMS delivered`,
            triggeredBy: "worker_invoice_created"
          });
        } catch (smsError) {
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
      const [makeCredentials, sendgridCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getCredentials(tenantId, "sendgrid"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const makeResult = await fireMakeWebhook(makeCredentials, "jobCompleteWebhookUrl", {
        tenant_slug: tenant?.slug,
        business_name: businessName,
        event_key: "invoicePaid",
        triggered_at: new Date().toISOString(),
        invoice_id: invoice?.id,
        invoice_number: invoice?.number ?? payload.invoiceNumber,
        amount: invoice?.amount,
        customer: {
          id: customer?.id,
          name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
          phone: customer?.phone,
          email: customer?.email
        }
      });

      await logPlatformEvent({
        tenantId,
        eventType: "webhook_fired",
        service: "make",
        direction: "outbound",
        status: makeResult.ok ? "success" : makeResult.status === 0 ? "pending" : "failed",
        requestSummary: "Make.com invoice paid webhook",
        responseSummary: makeResult.body.slice(0, 200),
        triggeredBy: "worker_invoice_paid"
      });

      if (customer?.email) {
        try {
          const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "the amount";
          const html = buildBrandedEmailHtml({
            businessName,
            logoUrl: tenant?.profile?.logoUrl,
            primaryColour: tenant?.profile?.primaryColour,
            bodyHtml: `
              <p>Hi ${customer.firstName},</p>
              <p>✅ Your payment of <strong>${amount}</strong> to <strong>${businessName}</strong> has been received.</p>
              <p>Invoice: <strong>${invoice?.number ?? payload.invoiceNumber}</strong></p>
              <p>Thank you for your business — we look forward to working with you again!</p>
            `,
            footerText: `${businessName} | ${tenant?.profile?.phone ?? ""} | ${tenant?.profile?.email ?? ""}`
          });

          await sendEmail(
            sendgridCredentials,
            customer.email,
            `Payment received — ${businessName}`,
            html
          );

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
      const [twilioCredentials, tenant, customer, invoice] = await Promise.all([
        getCredentials(tenantId, "twilio"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId),
        getInvoice(payload.invoiceId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        try {
          const amount = invoice?.amount ? `$${invoice.amount.toFixed(2)}` : "";
          const linkPart = invoice?.paymentLink ? ` Pay here: ${invoice.paymentLink}` : "";
          await sendSms(
            twilioCredentials,
            customer.phone,
            `Hi ${customer.firstName}, a friendly reminder that invoice ${invoice?.number ?? payload.invoiceNumber}${amount ? ` for ${amount}` : ""} from ${businessName} is still outstanding.${linkPart}`
          );

          await logPlatformEvent({
            tenantId,
            eventType: "api_call",
            service: SMS_PROVIDER_SERVICE,
            direction: "outbound",
            status: "success",
            requestSummary: `Payment reminder SMS to ${customer.firstName} ${customer.lastName}`,
            responseSummary: `Invoice ${invoice?.number ?? payload.invoiceNumber} reminder sent`,
            triggeredBy: "worker_payment_reminder"
          });
        } catch (smsError) {
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
      const [twilioCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "twilio"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        try {
          await sendSms(
            twilioCredentials,
            customer.phone,
            `Hi ${customer.firstName}! It's ${businessName} — it's been a while since your last service. Would you like to book again? Reply or call us to schedule.`
          );

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
      const [twilioCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "twilio"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";
      const feedbackLink = tenant?.slug ? buildFeedbackLink({
        tenantSlug: tenant.slug,
        tenantId,
        jobId: payload.jobId
      }) : null;

      if (customer?.phone) {
        try {
          await sendSms(
            twilioCredentials,
            customer.phone,
            feedbackLink
              ? `Hi ${customer.firstName}, how did we do? ${businessName} would love your feedback: ${feedbackLink}`
              : `Hi ${customer.firstName}, how did we do? ${businessName} would love your feedback — reply with a rating from 1-5 ⭐`
          );

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
      const [twilioCredentials, tenant, customer] = await Promise.all([
        getCredentials(tenantId, "twilio"),
        getTenantWithProfile(tenantId),
        getCustomer(payload.customerId)
      ]);

      const businessName = tenant?.profile?.businessName ?? "Your service provider";

      if (customer?.phone) {
        try {
          await sendSms(
            twilioCredentials,
            customer.phone,
            `Hi ${customer.firstName}, we're so glad you had a great experience with ${businessName}! If you have a moment, a Google review would mean the world to us 🌟`
          );

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

    case "schedule.recalculate": {
      const [makeCredentials, tenant] = await Promise.all([
        getCredentials(tenantId, "make_com"),
        getTenantWithProfile(tenantId)
      ]);

      const recommendations = tenantId ? await getSchedulerRecommendations(tenantId) : [];
      const flagged = recommendations.filter((entry) => entry.severity !== "ok");

      if (flagged.length > 0) {
        const makeResult = await fireMakeWebhook(makeCredentials, "scheduleUpdateWebhookUrl", {
          tenant_slug: tenant?.slug,
          business_name: tenant?.profile?.businessName,
          event_key: "scheduleUpdate",
          triggered_at: new Date().toISOString(),
          flagged_count: flagged.length,
          recommendations: flagged.map((entry) => ({ severity: entry.severity, summary: entry.summary }))
        });

        await logPlatformEvent({
          tenantId,
          eventType: makeResult.ok ? "webhook_fired" : "info",
          service: "make",
          direction: "outbound",
          status: makeResult.ok ? "success" : "pending",
          requestSummary: `Schedule update webhook: ${flagged.length} flagged jobs`,
          responseSummary: makeResult.body.slice(0, 200),
          triggeredBy: "worker_schedule_recalculate"
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
          const sendgridCredentials = await getCredentials(tenantId, "sendgrid");
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
            footerText: businessName
          });

          if (tenant?.profile?.email) {
            await sendEmail(sendgridCredentials, tenant.profile.email, `AI pricing suggestions ready — ${businessName}`, html);
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
        eventType: failedJob.status === "failed" ? "error" : "warning",
        service: "worker",
        direction: "outbound",
        status: failedJob.status === "failed" ? "failed" : "pending",
        requestSummary: `Automation ${job.kind} ${failedJob.status === "failed" ? "failed permanently" : "scheduled for retry"}`,
        responseSummary: failedJob.status === "failed" ? null : `Retry ${failedJob.attempts}/${5} queued`,
        errorMessage: message,
        triggeredBy: "worker_retry_manager"
      });

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

  console.log(`FlowLab worker online. Monitoring ${tenants.length} tenant(s).`);

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

  await logWorkerBoot();

  do {
    const result = await processAutomationBatch(25);
    console.log(`Processed ${result.claimed} automation job(s). ${result.completed} completed, ${result.failed} failed.`);

    if (runOnce) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);
}
