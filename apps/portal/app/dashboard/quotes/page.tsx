import Link from "next/link";

import { getPricingModel } from "@flowlab/contracts";
import { getTenantCustomers, getTenantQuotes, getTenantSettingsSnapshot } from "@flowlab/db";
import { prisma } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { requireTenantSession } from "../../../lib/session";

export default async function QuotesPage({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string; enquiryId?: string; created?: string }>;
}) {
  const session = await requireTenantSession();
  const query = await searchParams;
  const prefilledCustomerId = query.customerId ?? "";
  const prefilledEnquiryId = query.enquiryId ?? "";
  const [quotes, customers, settings, tenantUser, enquiry] = await Promise.all([
    getTenantQuotes(session.tenantId),
    getTenantCustomers(session.tenantId),
    getTenantSettingsSnapshot(session.tenantId),
    prisma.tenantUser.findFirst({ where: { tenantId: session.tenantId }, select: { onboardingStep: true, onboardingCompleted: true } }),
    prefilledEnquiryId
      ? prisma.enquiry.findFirst({
          where: {
            id: prefilledEnquiryId,
            tenantId: session.tenantId
          }
        })
      : Promise.resolve(null)
  ]);

  const businessType = settings.profile?.businessType ?? "other";
  const pricingModel = getPricingModel(businessType);
  const rate = settings.pricingRates[0];
  const pricingConfigured = rate != null && (
    (pricingModel === "area_based" && rate.baseRatePerSquareM != null) ||
    (pricingModel === "hourly" && rate.hourlyRate != null) ||
    (pricingModel === "flat_rate" && (rate.calloutFee != null || rate.minimumCharge != null))
  );
  const onboardingComplete = tenantUser?.onboardingCompleted ?? false;
  const needsPricingSetup = !pricingConfigured && !onboardingComplete;

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Quote work clearly and send the customer a link."
        description="Pick a customer, describe the job, and FlowLab prices the draft using your configured model. Review the figure, then send a branded approval link."
        section="revenue"
      />
      {query.created === "1" ? (
        <div className="surface" style={{ borderLeft: "3px solid #38bdf8" }}>
          Draft quote created and linked to the selected customer{prefilledEnquiryId ? " enquiry" : ""}.
        </div>
      ) : null}

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
          <input type="hidden" name="enquiryId" value={prefilledEnquiryId} />
          <label className="label">
            Customer
            <select className="select" name="customerId" required defaultValue={prefilledCustomerId}>
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
            <textarea
              className="textarea"
              name="serviceRequest"
              placeholder="Describe the services to be provided at this property."
              required
              defaultValue={enquiry?.serviceRequest ?? ""}
            />
          </label>
          {pricingModel === "area_based" && (
            <>
              <label className="label">
                Area estimate (m²)
                <input className="input" name="areaSquareMetres" type="number" min="1" defaultValue="90" />
              </label>
              <label className="label">
                Site condition
                <select className="select" name="siteCondition" defaultValue="standard">
                  <option value="standard">Standard</option>
                  <option value="overgrown">Overgrown</option>
                  <option value="heavily_overgrown">Heavily overgrown</option>
                </select>
              </label>
            </>
          )}
          {pricingModel === "hourly" && (
            <label className="label">
              Estimated hours
              <input className="input" name="estimatedHours" type="number" min="0.5" step="0.5" defaultValue="2" />
            </label>
          )}
          <button className="cta" type="submit" disabled={needsPricingSetup || undefined}>
            Generate draft quote
          </button>
        </form>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>How it works</h2>
          <div className="surface-soft">
            Your pricing rates are used to generate a draft figure. Review it, adjust if needed, then fire it off.
          </div>
          {enquiry ? (
            <div className="surface-soft" style={{ marginTop: 18 }}>
              <strong>Working from a live enquiry</strong>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                This draft will be linked back to the enquiry received on {new Date(enquiry.createdAt).toLocaleString()}.
              </div>
            </div>
          ) : null}
          <div className="surface-soft" style={{ marginTop: 18 }}>
            The customer gets a secure, branded link — no login required. Once they accept, you can send an agreement with one click.
          </div>
          {rate && (
            <div className="surface-soft" style={{ marginTop: 18 }}>
              <strong>Your rates</strong>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                {pricingModel === "area_based" && `$${rate.baseRatePerSquareM ?? "—"}/m² · Min $${rate.minimumCharge ?? "—"}`}
                {pricingModel === "hourly" && `$${rate.hourlyRate ?? "—"}/hr · Min $${rate.minimumCharge ?? "—"}`}
                {pricingModel === "flat_rate" && `Call-out $${rate.calloutFee ?? "—"} · Min $${rate.minimumCharge ?? "—"}`}
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
                  <CustomerLink customerId={quote.customer.id} className="inline-entity-link">
                    {quote.customer.firstName} {quote.customer.lastName}
                  </CustomerLink>
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
