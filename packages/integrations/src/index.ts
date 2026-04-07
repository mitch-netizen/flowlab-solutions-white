import crypto from "node:crypto";

import Stripe from "stripe";

import type { AutomationBlueprintDescriptor, IntegrationService, IntegrationTestResult } from "@flowlab/contracts";
import { automationBlueprints, serviceLabels } from "@flowlab/contracts";

const algorithm = "aes-256-gcm";
const BREVO_API_BASE = "https://api.brevo.com/v3";

function getMasterKey() {
  const source = process.env.ENCRYPTION_MASTER_KEY ?? "development-master-key";
  return crypto.createHash("sha256").update(source).digest();
}

export function encryptJson(payload: Record<string, string>) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getMasterKey(), iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptJson(input: string | null | undefined) {
  if (!input) {
    return {};
  }

  const buffer = Buffer.from(input, "base64");
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  const decipher = crypto.createDecipheriv(algorithm, getMasterKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as Record<string, string>;
}

export const integrationHelpText: Record<IntegrationService, string> = {
  twilio: "Send transactional SMS confirmations, reminders, and ETA updates through Brevo.",
  sendgrid: "Deliver branded transactional emails and invoices through Brevo.",
  stripe: "Accept invoice payments and receive payment webhooks.",
  docuseal: "Send agreements for e-signature and track signing completion.",
  google_maps: "Estimate routes, drive times, and map service areas.",
  xero: "Sync invoices and accounting metadata with Xero.",
  make_com: "Push automation triggers to the tenant's own Make.com scenarios.",
  claude: "Use FlowLab-managed AI for quoting, scheduling, and learning."
};

export const integrationFieldDefinitions: Record<
  IntegrationService,
  Array<{ name: string; label: string; placeholder: string; type?: "text" | "password" | "url" | "email" }>
> = {
  twilio: [
    { name: "apiKey", label: "Brevo API key", placeholder: "xkeysib-...", type: "password" },
    { name: "sender", label: "SMS sender", placeholder: "FlowLabSMS" },
    { name: "organisationPrefix", label: "Organisation prefix", placeholder: "Quinnys" }
  ],
  sendgrid: [
    { name: "apiKey", label: "Brevo API key", placeholder: "xkeysib-...", type: "password" },
    { name: "fromEmail", label: "From email", placeholder: "ops@business.com", type: "email" },
    { name: "fromName", label: "From name", placeholder: "Business name" },
    { name: "sandboxMode", label: "Sandbox mode", placeholder: "true to validate without sending" }
  ],
  stripe: [
    { name: "publishableKey", label: "Publishable key", placeholder: "pk_..." },
    { name: "secretKey", label: "Secret key", placeholder: "sk_...", type: "password" },
    { name: "webhookSecret", label: "Webhook secret", placeholder: "whsec_...", type: "password" }
  ],
  docuseal: [
    { name: "apiKey", label: "API key", placeholder: "DocuSeal API key", type: "password" },
    { name: "webhookSecretKey", label: "Webhook secret header", placeholder: "x-docuseal-secret" },
    { name: "webhookSecretValue", label: "Webhook secret value", placeholder: "shared-secret-value", type: "password" }
  ],
  google_maps: [
    { name: "apiKey", label: "API key", placeholder: "Google Maps API key", type: "password" }
  ],
  xero: [
    { name: "clientId", label: "Client ID", placeholder: "Xero client id" },
    { name: "clientSecret", label: "Client secret", placeholder: "Xero client secret", type: "password" }
  ],
  make_com: automationBlueprints.map((descriptor) => ({
    name: descriptor.webhookKey,
    label: `${descriptor.title} webhook`,
    placeholder: "https://hook.make.com/...",
    type: "url" as const
  })),
  claude: []
};

export async function testIntegration(service: IntegrationService, credentials: Record<string, string>): Promise<IntegrationTestResult> {
  const label = serviceLabels[service];
  const testedAt = new Date().toISOString();

  if (service === "claude") {
    return {
      service,
      ok: true,
      status: "connected",
      message: "FlowLab-managed Claude credits are active for this tenant.",
      testedAt
    };
  }

  if (service === "make_com") {
    const webhookEntries = Object.entries(credentials).filter(
      ([key, value]) => key.toLowerCase().includes("webhook") && value.trim().length > 0
    );
    const invalidWebhook = webhookEntries.find(([, value]) => {
      try {
        const url = new URL(value);
        return url.protocol !== "https:";
      } catch {
        return true;
      }
    });
    const webhookCount = webhookEntries.length;

    if (invalidWebhook) {
      return {
        service,
        ok: false,
        status: "error",
        message: `Webhook URL is invalid for ${invalidWebhook[0]}. Use a full https:// Make.com webhook URL.`,
        testedAt
      };
    }

    const missingWebhookCount = automationBlueprints.length - webhookCount;
    return {
      service,
      ok: webhookCount > 0,
      status: webhookCount > 0 ? "connected" : "error",
      message:
        webhookCount > 0
          ? `${webhookCount} Make.com webhook${webhookCount === 1 ? "" : "s"} configured${missingWebhookCount > 0 ? `, ${missingWebhookCount} still missing.` : "."}`
          : "Add at least one Make.com webhook URL to test connectivity.",
      testedAt
    };
  }

  if (service === "stripe") {
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY || "";

    if (!secretKey) {
      return {
        service,
        ok: false,
        status: "error",
        message: "No Stripe secret key is configured.",
        testedAt
      };
    }

    try {
      const stripe = getStripeClient(secretKey);
      const account = await stripe.accounts.retrieve();
      return {
        service,
        ok: true,
        status: "connected",
        message: `Stripe account ${account.id} is reachable.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Stripe test failed",
        testedAt
      };
    }
  }

  if (service === "docuseal") {
    const apiKey = credentials.apiKey || process.env.DOCUSEAL_API_KEY || "";

    if (!apiKey) {
      return {
        service,
        ok: false,
        status: "error",
        message: "No DocuSeal API key is configured.",
        testedAt
      };
    }

    try {
      const response = await fetch("https://api.docuseal.com/submissions?limit=1", {
        headers: {
          "X-Auth-Token": apiKey
        }
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "DocuSeal account lookup failed");
      }

      return {
        service,
        ok: true,
        status: "connected",
        message: "DocuSeal API is reachable.",
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "DocuSeal test failed",
        testedAt
      };
    }
  }

  if (service === "twilio") {
    const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
    const sender = credentials.sender || process.env.BREVO_SMS_SENDER || "";
    if (!apiKey || !sender) {
      return {
        service,
        ok: false,
        status: "error",
        message: "Brevo API key and SMS sender are required.",
        testedAt
      };
    }
    try {
      const account = await getBrevoAccount(apiKey);
      return {
        service,
        ok: true,
        status: "connected",
        message: `Brevo account "${getBrevoAccountName(account)}" is reachable for SMS sending.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Brevo SMS credential check failed",
        testedAt
      };
    }
  }

  if (service === "sendgrid") {
    const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
    const fromEmail = credentials.fromEmail || process.env.BREVO_FROM_EMAIL || "";
    if (!apiKey || !fromEmail) {
      return {
        service,
        ok: false,
        status: "error",
        message: "Brevo API key and From Email are required.",
        testedAt
      };
    }
    try {
      const account = await getBrevoAccount(apiKey);
      return {
        service,
        ok: true,
        status: "connected",
        message: `Brevo account "${getBrevoAccountName(account)}" is reachable for transactional email from ${fromEmail}.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Brevo email credential check failed",
        testedAt
      };
    }
  }

  const hasValues = Object.values(credentials).some(Boolean);

  return {
    service,
    ok: hasValues,
    status: hasValues ? "connected" : "error",
    message: hasValues ? `${label} credentials look ready for a live connection test.` : `No ${label} credentials were supplied.`,
    testedAt
  };
}

async function getBrevoAccount(apiKey: string) {
  const response = await fetch(`${BREVO_API_BASE}/account`, {
    headers: {
      accept: "application/json",
      "api-key": apiKey
    },
    signal: AbortSignal.timeout(10_000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo account lookup failed"));
  }

  return payload as {
    companyName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

function getBrevoAccountName(account: {
  companyName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}) {
  return (
    account.companyName ||
    [account.firstName, account.lastName].filter(Boolean).join(" ") ||
    account.email ||
    "your Brevo account"
  );
}

function getBrevoErrorMessage(payload: unknown, status: number, fallback: string) {
  if (payload && typeof payload === "object") {
    const message = "message" in payload ? payload.message : undefined;
    const code = "code" in payload ? payload.code : undefined;

    if (typeof message === "string" && typeof code === "string") {
      return `${message} (${code})`;
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return `${fallback} (${status})`;
}

function normalizeBrevoRecipientPhone(input: string) {
  const digits = input.replace(/\D+/g, "");
  return digits || input.trim();
}

function stripHtml(input: string) {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAutomationBlueprintPayloads(input: {
  tenantSlug: string;
  businessName: string;
  rootDomain?: string;
  descriptors?: AutomationBlueprintDescriptor[];
}) {
  const rootDomain = input.rootDomain ?? "flowlabsolutions.com.au";
  const baseWebhookUrl = `https://${input.tenantSlug}.${rootDomain}/api/automation`;
  const descriptors = input.descriptors ?? automationBlueprints;

  return descriptors.map((descriptor, index) => {
    const keyName = descriptor.webhookKey.replace(/Url$/, "");
    const body = {
      flowlab_template_version: "v1",
      title: descriptor.title,
      business_name: input.businessName,
      setup_notes: [
        "Replace every {{...}} placeholder with tenant-owned credentials before enabling the scenario.",
        "Import this blueprint into Make.com and connect the trigger module to the provided FlowLab webhook.",
        "The payload examples mirror the current FlowLab public contract and can be extended later."
      ],
      scenario: {
        webhook_url_variable: `{{${descriptor.webhookKey}}}`,
        default_flowlab_webhook: `${baseWebhookUrl}/${keyName}`,
        suggested_schedule: index === 4 || index >= 8 ? "Configure in Make.com scheduler" : "Triggered by FlowLab webhook",
        modules: [
          {
            step: 1,
            app: "FlowLab webhook",
            action: "Receive tenant payload",
            config: {
              url: `${baseWebhookUrl}/${keyName}`,
              tenant_slug: input.tenantSlug
            }
          },
          {
            step: 2,
            app: "Replace with tenant service",
            action: descriptor.description,
            config: {
              credential_placeholder: "{{tenant_credential}}",
              notes: `Connect the tenant's own ${descriptor.title.toLowerCase()} automation in Make.com.`
            }
          }
        ],
        example_payload: {
          tenant_slug: input.tenantSlug,
          business_name: input.businessName,
          event_key: keyName,
          triggered_at: "2026-04-02T09:00:00.000Z",
          customer: {
            name: "Sarah Johnson",
            phone: "+61400111111",
            email: "sarah@example.com"
          },
          job: {
            reference: "QMS-2001",
            service: "Mow & edge",
            suburb: "Tannum Sands"
          }
        }
      }
    };

    return {
      filename: descriptor.filename,
      contents: JSON.stringify(body, null, 2)
    };
  });
}

export function buildDocuSealRequest(input: {
  businessName: string;
  customerName: string;
  customerEmail: string;
  agreementTitle: string;
  accessToken: string;
  rootDomain?: string;
  tenantSlug?: string;
}) {
  const rootDomain = input.rootDomain ?? "flowlabsolutions.com.au";
  const baseHost = input.tenantSlug ? `https://${input.tenantSlug}.${rootDomain}` : `https://app.${rootDomain}`;

  return {
    provider: "docuseal",
    externalRequestId: `ds_${Math.random().toString(36).slice(2, 10)}`,
    embeddedSignUrl: `${baseHost}/sign/${input.accessToken}`,
    payload: {}
  };
}

export function verifyDocuSealEventSecret(input: {
  expectedHeaderName?: string;
  expectedHeaderValue?: string;
  headers: Headers;
}) {
  if (!input.expectedHeaderName || !input.expectedHeaderValue) {
    return true;
  }

  const actual = input.headers.get(input.expectedHeaderName);
  return actual === input.expectedHeaderValue;
}

export async function sendDocuSealSignatureRequest(input: {
  apiKey: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  agreementTitle: string;
  agreementText: string;
  accessToken: string;
  callbackUrl: string;
}) {
  const request = buildDocuSealRequest({
    businessName: input.businessName,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    agreementTitle: input.agreementTitle,
    accessToken: input.accessToken
  });

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 40px; color: #0f172a;">
        <h1>${input.agreementTitle}</h1>
        <p><strong>Business:</strong> ${input.businessName}</p>
        <p><strong>Customer:</strong> ${input.customerName}</p>
        <div style="margin-top: 24px; white-space: pre-wrap;">${input.agreementText}</div>
        <div style="margin-top: 40px;">
          <p><strong>Signature</strong></p>
          <docuseal-signature data-role="Signer 1"></docuseal-signature>
          <docuseal-date data-role="Signer 1"></docuseal-date>
          <docuseal-text data-role="Signer 1" data-name="Full Name"></docuseal-text>
        </div>
      </body>
    </html>
  `;

  const response = await fetch("https://api.docuseal.com/submissions/html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": input.apiKey
    },
    body: JSON.stringify({
      name: input.agreementTitle,
      html,
      send_email: true,
      order: "preserved",
      external_id: input.accessToken,
      submitters: [
        {
          name: input.customerName,
          email: input.customerEmail,
          role: "Signer 1",
          external_id: input.accessToken
        }
      ],
      webhook_url: input.callbackUrl
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.message || payload?.error || "DocuSeal signature request failed";
    throw new Error(message);
  }

  const submission = payload;
  return {
    ...request,
    externalRequestId: String(submission.id ?? request.externalRequestId),
    callbackUrl: input.callbackUrl,
    response: submission
  };
}

export function buildStripePaymentLink(input: {
  tenantSlug: string;
  invoiceToken: string;
  invoiceNumber: string;
  amount: number;
  rootDomain?: string;
}) {
  const rootDomain = input.rootDomain ?? "flowlabsolutions.com.au";
  const sessionId = `cs_test_${Math.random().toString(36).slice(2, 12)}`;
  const publicUrl = `https://${input.tenantSlug}.${rootDomain}/invoice/${input.invoiceToken}`;

  return {
    provider: "stripe",
    sessionId,
    url: `https://checkout.stripe.com/pay/${sessionId}?invoice=${encodeURIComponent(input.invoiceNumber)}&return_url=${encodeURIComponent(publicUrl)}`,
    metadata: {
      invoiceToken: input.invoiceToken,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount
    }
  };
}

const stripeClients = new Map<string, Stripe>();

export function getStripeClient(secretKey: string) {
  if (!stripeClients.has(secretKey)) {
    stripeClients.set(
      secretKey,
      new Stripe(secretKey, {
        maxNetworkRetries: 1
      })
    );
  }

  return stripeClients.get(secretKey)!;
}

// ---------------------------------------------------------------------------
// Outbound communication helpers
// ---------------------------------------------------------------------------

export function buildBrandedEmailHtml(input: {
  businessName: string;
  logoUrl?: string | null;
  primaryColour?: string | null;
  bodyHtml: string;
  footerText?: string;
}) {
  const colour = input.primaryColour ?? "#3B82F6";
  const logo = input.logoUrl
    ? `<img src="${input.logoUrl}" alt="${input.businessName}" style="max-height:48px; margin-bottom:0;" />`
    : `<span style="font-size:20px; font-weight:700;">${input.businessName}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:${colour};padding:24px 32px;text-align:center;color:#ffffff;">
          ${logo}
        </td></tr>
        <tr><td style="padding:32px;color:#0f172a;line-height:1.7;font-size:15px;">
          ${input.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">
          ${input.footerText ?? `<strong>${input.businessName}</strong>`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an SMS via the tenant's configured Brevo account.
 * Throws if credentials are missing or the Brevo API call fails.
 */
export async function sendSms(
  credentials: Record<string, string>,
  to: string,
  body: string
): Promise<void> {
  const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
  const sender = credentials.sender || process.env.BREVO_SMS_SENDER || "";
  const organisationPrefix =
    credentials.organisationPrefix || process.env.BREVO_SMS_ORGANISATION_PREFIX || "";
  if (!apiKey || !sender) {
    throw new Error("Brevo SMS credentials incomplete — apiKey and sender are required");
  }

  const response = await fetch(`${BREVO_API_BASE}/transactionalSMS/send`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender,
      recipient: normalizeBrevoRecipientPhone(to),
      content: body,
      type: "transactional",
      ...(organisationPrefix ? { organisationPrefix } : {})
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo SMS send failed"));
  }
}

/**
 * Send a transactional email via the tenant's configured Brevo account.
 * Throws if credentials are missing or the Brevo API call fails.
 */
export async function sendEmail(
  credentials: Record<string, string>,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
  const fromEmail = credentials.fromEmail || process.env.BREVO_FROM_EMAIL || "";
  const fromName = credentials.fromName || process.env.BREVO_FROM_NAME || "";
  const sandboxMode = credentials.sandboxMode || process.env.BREVO_SANDBOX_MODE || "";
  if (!apiKey || !fromEmail) {
    throw new Error("Brevo email credentials incomplete — apiKey and fromEmail are required");
  }

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: fromName || fromEmail
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: stripHtml(html),
      ...(sandboxMode === "true" ? { headers: { "X-Sib-Sandbox": "drop" } } : {})
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo email send failed"));
  }
}

/**
 * Fire a Make.com webhook for a given automation key.
 * Returns ok:false (without throwing) when the webhook URL is not configured —
 * the caller decides whether to log a warning or treat it as a hard error.
 */
export async function fireMakeWebhook(
  credentials: Record<string, string>,
  webhookKey: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = credentials[webhookKey];
  if (!url) {
    return { ok: false, status: 0, body: `No webhook URL configured for key: ${webhookKey}` };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : "Webhook request failed"
    };
  }
}
