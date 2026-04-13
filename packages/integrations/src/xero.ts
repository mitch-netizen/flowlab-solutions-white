/**
 * Xero integration helpers.
 *
 * Xero is the source of truth for invoicing in FlowLab. The flow is:
 *   1. When a customer is created in the CRM, upsert them as a Xero Contact.
 *   2. When a job is ready to invoice, push it to Xero to create the invoice.
 *   3. The local Invoice record mirrors the Xero invoice (id, status, syncedAt).
 *   4. Payment status is read back from Xero — no Stripe required for invoicing.
 *
 * All functions accept a `credentials` object decrypted from TenantIntegration.credentialsJson.
 * They automatically refresh the access token when expired and return updated credentials
 * so the caller can persist the refreshed tokens.
 */

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_BASE = "https://api.xero.com";
const XERO_CONNECTIONS_URL = `${XERO_API_BASE}/connections`;

export interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO string
  xeroTenantId: string; // The Xero org tenant ID (from /connections)
  orgName?: string;
}

export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  Phones?: Array<{ PhoneType: string; PhoneNumber: string }>;
  Addresses?: Array<{ AddressType: string; AddressLine1?: string; City?: string }>;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Status: "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED" | "DELETED";
  AmountDue: number;
  AmountPaid: number;
  Total: number;
  DueDateString?: string;
  DateString?: string;
  Contact: { ContactID: string; Name: string };
  LineItems: Array<{ Description: string; Quantity: number; UnitAmount: number; LineAmount: number }>;
}

export interface XeroSyncResult<T> {
  data: T;
  /** Updated credentials if token was refreshed — persist these immediately */
  credentials: XeroCredentials;
}

// ── Token management ──────────────────────────────────────────────────────────

function isTokenExpired(credentials: XeroCredentials): boolean {
  if (!credentials.expiresAt) return true;
  const expiresAt = new Date(credentials.expiresAt).getTime();
  // Refresh 60 seconds early to avoid edge-case expiry mid-request
  return Date.now() > expiresAt - 60_000;
}

export async function refreshXeroToken(credentials: XeroCredentials): Promise<XeroCredentials> {
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed (${res.status}): ${body}`);
  }

  const token = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    ...credentials,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  };
}

/** Ensures a valid access token, refreshing if needed. */
async function ensureValidToken(credentials: XeroCredentials): Promise<XeroCredentials> {
  if (isTokenExpired(credentials)) {
    return refreshXeroToken(credentials);
  }
  return credentials;
}

function xeroHeaders(credentials: XeroCredentials) {
  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    "xero-tenant-id": credentials.xeroTenantId,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ── Contacts ─────────────────────────────────────────────────────────────────

/**
 * Upsert a customer as a Xero Contact.
 * - If the customer already has a xeroContactId, update the contact.
 * - Otherwise, search by email; if found, return the existing contact.
 * - If not found, create a new contact.
 *
 * This ensures one-to-one mapping between CRM customer and Xero Contact.
 */
export async function upsertXeroContact(
  rawCredentials: XeroCredentials,
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    suburb?: string | null;
    xeroContactId?: string | null;
  }
): Promise<XeroSyncResult<XeroContact>> {
  const credentials = await ensureValidToken(rawCredentials);
  const name = `${customer.firstName} ${customer.lastName}`.trim();

  const payload: Record<string, unknown> = {
    Name: name,
    EmailAddress: customer.email,
    Phones: customer.phone
      ? [{ PhoneType: "MOBILE", PhoneNumber: customer.phone }]
      : undefined,
    Addresses: customer.address
      ? [
          {
            AddressType: "STREET",
            AddressLine1: customer.address,
            City: customer.suburb ?? undefined,
          },
        ]
      : undefined,
  };

  // If we already have a Xero Contact ID, update in-place
  if (customer.xeroContactId) {
    payload.ContactID = customer.xeroContactId;
  } else {
    // Search by email first to avoid duplicates
    const searchRes = await fetch(
      `${XERO_API_BASE}/api.xro/2.0/Contacts?where=EmailAddress%3D%22${encodeURIComponent(customer.email)}%22`,
      { headers: xeroHeaders(credentials) }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json() as { Contacts: XeroContact[] };
      if (searchData.Contacts?.length > 0) {
        // Contact already exists in Xero — link it back
        return { data: searchData.Contacts[0], credentials };
      }
    }
  }

  // Create or update via POST /Contacts (Xero uses POST for both create and update)
  const res = await fetch(`${XERO_API_BASE}/api.xro/2.0/Contacts`, {
    method: "POST",
    headers: xeroHeaders(credentials),
    body: JSON.stringify({ Contacts: [payload] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero upsert contact failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { Contacts: XeroContact[] };
  if (!data.Contacts?.[0]) {
    throw new Error("Xero returned no contact after upsert");
  }

  return { data: data.Contacts[0], credentials };
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface CreateXeroInvoiceInput {
  xeroContactId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  dueAt: Date;
  reference?: string; // e.g. job summary
}

/**
 * Create an invoice in Xero.
 * Sets status to AUTHORISED so it appears in the Xero invoice register immediately.
 * Returns the full Xero invoice object including InvoiceID.
 */
export async function createXeroInvoice(
  rawCredentials: XeroCredentials,
  input: CreateXeroInvoiceInput
): Promise<XeroSyncResult<XeroInvoice>> {
  const credentials = await ensureValidToken(rawCredentials);

  const invoicePayload = {
    Type: "ACCREC", // Accounts receivable
    Contact: { ContactID: input.xeroContactId },
    InvoiceNumber: input.invoiceNumber,
    Reference: input.reference ?? undefined,
    Status: "AUTHORISED",
    DateString: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    DueDateString: input.dueAt.toISOString().split("T")[0],
    LineItems: [
      {
        Description: input.description,
        Quantity: 1,
        UnitAmount: input.amount,
        AccountCode: "200", // Standard Xero sales account
      },
    ],
  };

  const res = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices`, {
    method: "POST",
    headers: xeroHeaders(credentials),
    body: JSON.stringify({ Invoices: [invoicePayload] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero create invoice failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { Invoices: XeroInvoice[] };
  if (!data.Invoices?.[0]) {
    throw new Error("Xero returned no invoice after creation");
  }

  return { data: data.Invoices[0], credentials };
}

/**
 * Fetch the current status of a Xero invoice.
 * Use this to sync payment status back into FlowLab.
 */
export async function getXeroInvoice(
  rawCredentials: XeroCredentials,
  xeroInvoiceId: string
): Promise<XeroSyncResult<XeroInvoice>> {
  const credentials = await ensureValidToken(rawCredentials);

  const res = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices/${xeroInvoiceId}`, {
    headers: xeroHeaders(credentials),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero get invoice failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { Invoices: XeroInvoice[] };
  if (!data.Invoices?.[0]) {
    throw new Error(`Xero invoice ${xeroInvoiceId} not found`);
  }

  return { data: data.Invoices[0], credentials };
}

/**
 * Void a Xero invoice. Called when a FlowLab invoice is cancelled.
 */
export async function voidXeroInvoice(
  rawCredentials: XeroCredentials,
  xeroInvoiceId: string
): Promise<XeroSyncResult<XeroInvoice>> {
  const credentials = await ensureValidToken(rawCredentials);

  const res = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices/${xeroInvoiceId}`, {
    method: "POST",
    headers: xeroHeaders(credentials),
    body: JSON.stringify({ Invoices: [{ InvoiceID: xeroInvoiceId, Status: "VOIDED" }] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero void invoice failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { Invoices: XeroInvoice[] };
  return { data: data.Invoices[0], credentials };
}

/**
 * Get the Xero tenant (org) ID from the /connections endpoint.
 * Called once after OAuth to store xeroTenantId in credentials.
 */
export async function getXeroTenantId(accessToken: string): Promise<{ tenantId: string; orgName: string }> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero connections fetch failed (${res.status}): ${body}`);
  }

  const connections = await res.json() as Array<{ tenantId: string; tenantName: string; tenantType: string }>;
  const org = connections.find((c) => c.tenantType === "ORGANISATION") ?? connections[0];

  if (!org) {
    throw new Error("No Xero organisation found in connections");
  }

  return { tenantId: org.tenantId, orgName: org.tenantName };
}

/**
 * Test the Xero connection by fetching the organisation name.
 */
export async function testXeroConnection(credentials: XeroCredentials): Promise<{ ok: boolean; orgName?: string; error?: string }> {
  try {
    const valid = await ensureValidToken(credentials);
    // Try to list one invoice — if this works, the connection is healthy
    const res = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices?page=1`, {
      headers: xeroHeaders(valid),
    });
    if (!res.ok) {
      return { ok: false, error: `Xero API returned ${res.status}` };
    }
    return { ok: true, orgName: credentials.orgName };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
