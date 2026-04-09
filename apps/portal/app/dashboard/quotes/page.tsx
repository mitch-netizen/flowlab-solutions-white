import Link from "next/link";

import { getTenantCustomers, getTenantQuotes, getTenantSettingsSnapshot } from "@flowlab/db";
import { prisma } from "@flowlab/db";

import { requireTenantSession } from "../../../lib/session";

export default async function QuotesPage() {
  const session = await requireTenantSession();
  const [quotes, customers, settings, tenantUser] = await Promise.all([
    getTenantQuotes(session.tenantId),
    getTenantCustomers(session.tenantId),
    getTenantSettingsSnapshot(session.tenantId),
    prisma.tenantUser.findFirst({ where: { tenantId: session.tenantId }, select: { onboardingStep: true, onboardingCompleted: true } })
  ]);

  const pricingConfigured = settings.pricingRates.length > 0 && settings.pricingRates[0]?.baseRatePerSquareM;
  const onboardingComplete = tenantUser?.onboardingCompleted ?? false;
  const needsPricingSetup = !pricingConfigured && !onboardingComplete;

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">AI quoting</div>
        <h1>Price up a job and send the customer a link.</h1>
        <p style={{ color: "#cbd5e1" }}>Pick a customer, describe the work, and we&apos;ll crunch the numbers based on your pricing. The customer gets a branded link to review and accept.</p>
      </div>

      {needsPricingSetup && (
        <div className="surface" style={{ borderLeft: "3px solid #f59e0b" }}>
          <h2 style={{ marginTop: 0, color: "#fde68a" }}>Set up your pricing first</h2>
          <p style={{ color: "#cbd5e1", marginBottom: 16 }}>
            AI quoting uses your pricing rates to calculate job figures. Complete the pricing step in onboarding before generating your first quote.
          </p>
          <Link href="/dashboard/onboarding" className="cta" style={{ display: "inline-block" }}>
            Complete setup →
          </Link>
        </div>
      )}

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
          <button className="cta" type="submit" disabled={needsPricingSetup || undefined}>
            Generate draft quote
          </button>
        </form>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>How it works</h2>
          <div className="surface-soft">
            Your pricing rates and site condition are used to calculate a draft figure. Review it, adjust if needed, then fire it off.
          </div>
          <div className="surface-soft" style={{ marginTop: 18 }}>
            The customer gets a secure, branded link — no login required. Once they accept, you can send an agreement with one click.
          </div>
          {settings.pricingRates[0] && (
            <div className="surface-soft" style={{ marginTop: 18 }}>
              <strong>Your rates</strong>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                Base: ${settings.pricingRates[0].baseRatePerSquareM ?? "—"}/m² · Min charge: ${settings.pricingRates[0].minimumCharge ?? "—"}
              </div>
            </div>
          )}
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
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#64748b", textAlign: "center" }}>
                  No quotes yet.{" "}
                  {customers.length === 0 ? "Add a customer in CRM first." : "Create your first one above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
