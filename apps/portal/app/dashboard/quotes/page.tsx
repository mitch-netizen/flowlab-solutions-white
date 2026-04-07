import Link from "next/link";

import { getTenantCustomers, getTenantQuotes } from "@flowlab/db";

import { requireTenantSession } from "../../../lib/session";

export default async function QuotesPage() {
  const session = await requireTenantSession();
  const [quotes, customers] = await Promise.all([
    getTenantQuotes(session.tenantId),
    getTenantCustomers(session.tenantId)
  ]);

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">AI quoting</div>
        <h1>Generate draft quotes from tenant pricing and enquiry context.</h1>
        <p style={{ color: "#cbd5e1" }}>This uses the tenant pricing profile to create review-ready draft quotes and customer-facing token links.</p>
      </div>
      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/quotes/generate" method="post">
          <h2 style={{ marginTop: 0 }}>Create draft quote</h2>
          <label className="label">
            Customer
            <select className="select" name="customerId" required defaultValue="">
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Service request
            <textarea className="textarea" name="serviceRequest" defaultValue="Front lawn mow and edge, tidy up nature strip, and remove clippings." required />
          </label>
          <label className="label">
            Area estimate (m²)
            <input className="input" name="areaSquareMetres" type="number" min="20" defaultValue="90" />
          </label>
          <label className="label">
            Site condition
            <select className="select" name="siteCondition" defaultValue="standard">
              <option value="standard">Standard</option>
              <option value="overgrown">Overgrown</option>
              <option value="heavily_overgrown">Heavily overgrown</option>
            </select>
          </label>
          <button className="cta" type="submit">
            Generate draft quote
          </button>
        </form>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Drafting notes</h2>
          <div className="surface-soft">
            The current implementation uses tenant pricing rates and site condition to produce a draft amount, then logs an AI event so the health dashboard and usage reporting stay connected.
          </div>
          <div className="surface-soft" style={{ marginTop: 18 }}>
            Customer links are public, token-based, and white-labelled. Accepted quotes can create downstream agreement records automatically.
          </div>
        </div>
      </div>
      <div className="surface">
        <h2>Recent quotes</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Title</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Public link</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  {quote.customer.firstName} {quote.customer.lastName}
                </td>
                <td>{quote.title}</td>
                <td>{quote.status}</td>
                <td>${quote.amount}</td>
                <td>
                  <Link href={`/quote/${quote.accessToken}`}>Open quote</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
