import Link from "next/link";

import { getTenantAgreements, getTenantQuotes } from "@flowlab/db";

import { requireTenantSession } from "../../../lib/session";

export default async function AgreementsPage() {
  const session = await requireTenantSession();
  const [agreements, quotes] = await Promise.all([
    getTenantAgreements(session.tenantId),
    getTenantQuotes(session.tenantId)
  ]);

  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted");

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Agreements</div>
        <h1>Send branded agreements through the external signature provider.</h1>
        <p style={{ color: "#cbd5e1" }}>FlowLab owns the agreement records, status, and customer experience around the signing flow, while DocuSeal remains the signature backend.</p>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Accepted quotes ready for agreements</h2>
          <div className="stack">
            {acceptedQuotes.length > 0 ? (
              acceptedQuotes.map((quote) => (
                <form key={quote.id} action="/api/tenant/agreements/create" method="post" className="surface-soft form-grid">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <strong>{quote.title}</strong>
                  <div style={{ color: "#cbd5e1" }}>
                    {quote.customer.firstName} {quote.customer.lastName} · ${quote.amount}
                  </div>
                  <button className="cta" type="submit">
                    Send agreement
                  </button>
                </form>
              ))
            ) : (
              <div className="surface-soft">Accepted quotes will appear here once customers approve them.</div>
            )}
          </div>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Agreement status</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Agreement</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((agreement) => (
                <tr key={agreement.id}>
                  <td>{agreement.title}</td>
                  <td>{agreement.status}</td>
                  <td>
                    {agreement.customer.firstName} {agreement.customer.lastName}
                  </td>
                  <td>
                    <Link href={`/sign/${agreement.accessToken}`}>Open sign page</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
