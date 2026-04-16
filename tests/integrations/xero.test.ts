/**
 * Xero integration unit tests.
 *
 * All network calls are intercepted via vi.spyOn(global, "fetch") — no msw,
 * no live DB, no live Xero API.
 *
 * Covers:
 *   - refreshXeroToken: happy path token refresh
 *   - upsertXeroContact: automatic token refresh on 401, contact mapping
 *   - upsertXeroContact: existing contact found by email search (no-create path)
 *   - upsertXeroContact: create new contact when none found
 *   - createXeroInvoice: automatic token refresh on 401, InvoiceID returned
 *   - createXeroInvoice: correct payload structure sent to Xero
 *   - getXeroInvoice: fetches invoice and returns updated credentials
 *   - testXeroConnection: returns ok:true on healthy connection
 *   - testXeroConnection: returns ok:false on API error
 *   - isTokenExpired (via ensureValidToken path): expired token triggers refresh
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createXeroInvoice,
  getXeroInvoice,
  refreshXeroToken,
  testXeroConnection,
  upsertXeroContact,
  type XeroContact,
  type XeroCredentials,
  type XeroInvoice,
} from "@flowlab/integrations/xero";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Valid, non-expired credentials fixture. */
function makeCredentials(overrides: Partial<XeroCredentials> = {}): XeroCredentials {
  return {
    clientId: "client-id",
    clientSecret: "client-secret",
    accessToken: "access-token-original",
    refreshToken: "refresh-token-original",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    xeroTenantId: "xero-tenant-abc",
    orgName: "Acme Lawns Pty Ltd",
    ...overrides,
  };
}

/** Expired credentials — triggers an automatic refresh. */
function makeExpiredCredentials(overrides: Partial<XeroCredentials> = {}): XeroCredentials {
  return makeCredentials({
    expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    ...overrides,
  });
}

const MOCK_CONTACT: XeroContact = {
  ContactID: "contact-uuid-1",
  Name: "Jane Smith",
  EmailAddress: "jane@example.com",
  Phones: [{ PhoneType: "MOBILE", PhoneNumber: "0400000001" }],
  Addresses: [{ AddressType: "STREET", AddressLine1: "1 Main St", City: "Sydney" }],
};

const MOCK_INVOICE: XeroInvoice = {
  InvoiceID: "invoice-uuid-1",
  InvoiceNumber: "INV-0001",
  Status: "AUTHORISED",
  AmountDue: 150,
  AmountPaid: 0,
  Total: 150,
  DueDateString: "2026-04-23",
  DateString: "2026-04-16",
  OnlineInvoiceUrl: "https://invoicing.xero.com/pay/invoice-uuid-1",
  Contact: { ContactID: "contact-uuid-1", Name: "Jane Smith" },
  LineItems: [
    { Description: "Lawn mowing", Quantity: 1, UnitAmount: 150, LineAmount: 150 },
  ],
};

/** Build a minimal successful token refresh response body. */
function mockTokenRefreshResponse() {
  return {
    access_token: "access-token-refreshed",
    refresh_token: "refresh-token-new",
    expires_in: 1800,
  };
}

/** Helper: create a mock Response that resolves to JSON. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Helper: create a mock Response that resolves to text. */
function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(global, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── refreshXeroToken ──────────────────────────────────────────────────────────

describe("refreshXeroToken", () => {
  it("exchanges the refresh token and returns new credentials", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));

    const creds = makeCredentials();
    const result = await refreshXeroToken(creds);

    expect(result.accessToken).toBe("access-token-refreshed");
    expect(result.refreshToken).toBe("refresh-token-new");
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    // Unchanged fields should be preserved
    expect(result.clientId).toBe(creds.clientId);
    expect(result.xeroTenantId).toBe(creds.xeroTenantId);
  });

  it("sends Basic auth header derived from clientId and clientSecret", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));

    const creds = makeCredentials({ clientId: "myId", clientSecret: "mySecret" });
    await refreshXeroToken(creds);

    const [, options] = fetchSpy.mock.calls[0];
    const authHeader = (options as RequestInit).headers as Record<string, string>;
    const expected = `Basic ${Buffer.from("myId:mySecret").toString("base64")}`;
    expect(authHeader["Authorization"]).toBe(expected);
  });

  it("sends grant_type=refresh_token in the POST body", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));

    const creds = makeCredentials();
    await refreshXeroToken(creds);

    const [, options] = fetchSpy.mock.calls[0];
    // The implementation passes a URLSearchParams object as the body. Normalise
    // it to a plain string before asserting so the test is implementation-agnostic.
    const rawBody = (options as RequestInit).body;
    const bodyStr =
      rawBody instanceof URLSearchParams
        ? rawBody.toString()
        : String(rawBody ?? "");
    expect(bodyStr).toContain("grant_type=refresh_token");
    expect(bodyStr).toContain("refresh_token=refresh-token-original");
  });

  it("throws a descriptive error on non-OK token response", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("invalid_grant", 400));

    await expect(refreshXeroToken(makeCredentials())).rejects.toThrow(
      /Xero token refresh failed \(400\)/
    );
  });
});

// ── upsertXeroContact ─────────────────────────────────────────────────────────

describe("upsertXeroContact — existing contact found via email search", () => {
  it("returns the existing contact without creating a new one", async () => {
    const searchResponse = jsonResponse({ Contacts: [MOCK_CONTACT] });
    fetchSpy.mockResolvedValueOnce(searchResponse);

    const result = await upsertXeroContact(makeCredentials(), {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    });

    expect(result.data.ContactID).toBe("contact-uuid-1");
    // Only one fetch call — the search; no POST to create
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/Contacts");
  });
});

describe("upsertXeroContact — create new contact", () => {
  it("POSTs to /Contacts when no existing contact is found", async () => {
    // Search returns empty
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [] }));
    // Create returns the new contact
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [MOCK_CONTACT] }));

    const result = await upsertXeroContact(makeCredentials(), {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "0400000001",
      address: "1 Main St",
      suburb: "Sydney",
    });

    expect(result.data.ContactID).toBe("contact-uuid-1");
    expect(result.data.Name).toBe("Jane Smith");

    // Second call should be a POST to /Contacts
    const [url, options] = fetchSpy.mock.calls[1];
    expect(String(url)).toContain("/api.xro/2.0/Contacts");
    expect((options as RequestInit).method).toBe("POST");
  });

  it("maps phone and address correctly into the Xero payload", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [MOCK_CONTACT] }));

    await upsertXeroContact(makeCredentials(), {
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      phone: "0411111111",
      address: "99 Oak Ave",
      suburb: "Melbourne",
    });

    const [, options] = fetchSpy.mock.calls[1];
    const body = JSON.parse((options as RequestInit).body as string);
    const contact = body.Contacts[0];

    expect(contact.Name).toBe("Bob Jones");
    expect(contact.EmailAddress).toBe("bob@example.com");
    expect(contact.Phones[0].PhoneType).toBe("MOBILE");
    expect(contact.Phones[0].PhoneNumber).toBe("0411111111");
    expect(contact.Addresses[0].AddressType).toBe("STREET");
    expect(contact.Addresses[0].AddressLine1).toBe("99 Oak Ave");
    expect(contact.Addresses[0].City).toBe("Melbourne");
  });

  it("includes existing xeroContactId in payload when updating", async () => {
    // When xeroContactId is provided, skip the search and go straight to POST
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [MOCK_CONTACT] }));

    await upsertXeroContact(makeCredentials(), {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      xeroContactId: "contact-uuid-1",
    });

    // Only one call — the upsert POST (search is skipped)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.Contacts[0].ContactID).toBe("contact-uuid-1");
  });
});

describe("upsertXeroContact — automatic token refresh on expired token", () => {
  it("refreshes the token before calling the Xero Contacts API when token is expired", async () => {
    // 1. Token refresh call
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));
    // 2. Contact search (returns empty)
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [] }));
    // 3. Contact create
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [MOCK_CONTACT] }));

    const result = await upsertXeroContact(makeExpiredCredentials(), {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // First call must be to the token endpoint
    const [firstUrl] = fetchSpy.mock.calls[0];
    expect(String(firstUrl)).toContain("identity.xero.com/connect/token");

    // Returned credentials should carry the refreshed token
    expect(result.credentials.accessToken).toBe("access-token-refreshed");
  });
});

describe("upsertXeroContact — error handling", () => {
  it("throws when the Xero upsert POST returns a non-OK status", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Contacts: [] }));
    fetchSpy.mockResolvedValueOnce(textResponse("Validation failed", 422));

    await expect(
      upsertXeroContact(makeCredentials(), {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      })
    ).rejects.toThrow(/Xero upsert contact failed \(422\)/);
  });
});

// ── createXeroInvoice ─────────────────────────────────────────────────────────

describe("createXeroInvoice — happy path", () => {
  it("returns the xeroInvoiceId from the API response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [MOCK_INVOICE] }));

    const result = await createXeroInvoice(makeCredentials(), {
      xeroContactId: "contact-uuid-1",
      invoiceNumber: "INV-0001",
      description: "Lawn mowing",
      amount: 150,
      dueAt: new Date("2026-04-23"),
    });

    expect(result.data.InvoiceID).toBe("invoice-uuid-1");
    expect(result.data.InvoiceNumber).toBe("INV-0001");
    expect(result.data.Status).toBe("AUTHORISED");
    expect(result.data.OnlineInvoiceUrl).toBe("https://invoicing.xero.com/pay/invoice-uuid-1");
  });

  it("sends the correct payload structure to POST /Invoices", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [MOCK_INVOICE] }));

    const dueAt = new Date("2026-04-23");
    await createXeroInvoice(makeCredentials(), {
      xeroContactId: "contact-uuid-1",
      invoiceNumber: "INV-0001",
      description: "Lawn mowing",
      amount: 150,
      dueAt,
      reference: "Job abc12345",
    });

    const [url, options] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/api.xro/2.0/Invoices");
    expect((options as RequestInit).method).toBe("POST");

    const body = JSON.parse((options as RequestInit).body as string);
    const invoice = body.Invoices[0];

    expect(invoice.Type).toBe("ACCREC");
    expect(invoice.Status).toBe("AUTHORISED");
    expect(invoice.Contact.ContactID).toBe("contact-uuid-1");
    expect(invoice.InvoiceNumber).toBe("INV-0001");
    expect(invoice.Reference).toBe("Job abc12345");
    expect(invoice.LineItems[0].Description).toBe("Lawn mowing");
    expect(invoice.LineItems[0].UnitAmount).toBe(150);
    expect(invoice.LineItems[0].Quantity).toBe(1);
    expect(invoice.LineItems[0].AccountCode).toBe("200");
    expect(invoice.DueDateString).toBe("2026-04-23");
  });

  it("sends xero-tenant-id header on the invoice POST", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [MOCK_INVOICE] }));

    await createXeroInvoice(makeCredentials(), {
      xeroContactId: "contact-uuid-1",
      invoiceNumber: "INV-0001",
      description: "Mowing",
      amount: 100,
      dueAt: new Date("2026-04-30"),
    });

    const [, options] = fetchSpy.mock.calls[0];
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers["xero-tenant-id"]).toBe("xero-tenant-abc");
    expect(headers["Authorization"]).toBe("Bearer access-token-original");
  });
});

describe("createXeroInvoice — automatic token refresh on expired token", () => {
  it("refreshes the token when expired before posting the invoice", async () => {
    // 1. Token refresh
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));
    // 2. Invoice create
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [MOCK_INVOICE] }));

    const result = await createXeroInvoice(makeExpiredCredentials(), {
      xeroContactId: "contact-uuid-1",
      invoiceNumber: "INV-0002",
      description: "Hedge trimming",
      amount: 80,
      dueAt: new Date("2026-04-30"),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchSpy.mock.calls[0];
    expect(String(firstUrl)).toContain("identity.xero.com/connect/token");

    expect(result.credentials.accessToken).toBe("access-token-refreshed");
    expect(result.data.InvoiceID).toBe("invoice-uuid-1");
  });
});

describe("createXeroInvoice — error handling", () => {
  it("throws when Xero returns a non-OK status", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("Contact not found", 404));

    await expect(
      createXeroInvoice(makeCredentials(), {
        xeroContactId: "bad-id",
        invoiceNumber: "INV-0099",
        description: "Test",
        amount: 50,
        dueAt: new Date(),
      })
    ).rejects.toThrow(/Xero create invoice failed \(404\)/);
  });

  it("throws when Xero returns an empty Invoices array", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [] }));

    await expect(
      createXeroInvoice(makeCredentials(), {
        xeroContactId: "contact-uuid-1",
        invoiceNumber: "INV-0099",
        description: "Test",
        amount: 50,
        dueAt: new Date(),
      })
    ).rejects.toThrow(/Xero returned no invoice after creation/);
  });
});

// ── getXeroInvoice ────────────────────────────────────────────────────────────

describe("getXeroInvoice", () => {
  it("fetches invoice by ID and returns it with credentials", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [MOCK_INVOICE] }));

    const result = await getXeroInvoice(makeCredentials(), "invoice-uuid-1");

    expect(result.data.InvoiceID).toBe("invoice-uuid-1");
    expect(result.data.Status).toBe("AUTHORISED");
    expect(result.data.AmountDue).toBe(150);

    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/api.xro/2.0/Invoices/invoice-uuid-1");
  });

  it("throws when the invoice is not found", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("Not Found", 404));

    await expect(getXeroInvoice(makeCredentials(), "bad-id")).rejects.toThrow(
      /Xero get invoice failed \(404\)/
    );
  });
});

// ── testXeroConnection ────────────────────────────────────────────────────────

describe("testXeroConnection", () => {
  it("returns ok:true with orgName when Xero API responds 200", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [] }));

    const result = await testXeroConnection(makeCredentials({ orgName: "Green Thumb Pty Ltd" }));

    expect(result.ok).toBe(true);
    expect(result.orgName).toBe("Green Thumb Pty Ltd");
    expect(result.error).toBeUndefined();
  });

  it("returns ok:false with error message when Xero API returns non-OK", async () => {
    fetchSpy.mockResolvedValueOnce(textResponse("Forbidden", 403));

    const result = await testXeroConnection(makeCredentials());

    expect(result.ok).toBe(false);
    expect(result.error).toContain("403");
  });

  it("returns ok:false when fetch throws (network error)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network failure"));

    const result = await testXeroConnection(makeCredentials());

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Network failure");
  });

  it("refreshes an expired token before testing the connection", async () => {
    // 1. Token refresh
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenRefreshResponse()));
    // 2. Connection test (list invoices)
    fetchSpy.mockResolvedValueOnce(jsonResponse({ Invoices: [] }));

    const result = await testXeroConnection(makeExpiredCredentials());

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });
});
