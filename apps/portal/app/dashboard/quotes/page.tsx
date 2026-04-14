import Link from "next/link";

import { getPricingModel } from "@flowlab/contracts";
import { getTenantCustomers, getTenantQuotes, getTenantSettingsSnapshot } from "@flowlab/db";
import { prisma } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageHeader from "../../../components/dashboard-page-header";
import { getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";

function getPricingSummary(
  pricingModel: ReturnType<typeof getPricingModel>,
  rate: Awaited<ReturnType<typeof getTenantSettingsSnapshot>>["pricingRates"][number] | undefined
) {
  if (!rate) {
    return "Pricing rates have not been configured yet.";
  }

  if (pricingModel === "area_based") {
    return `$${rate.baseRatePerSquareM ?? "—"}/m² · Overgrown $${rate.overgrownRate ?? "—"}/m² · Minimum $${rate.minimumCharge ?? "—"}`;
  }

  if (pricingModel === "hourly") {
    return `$${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`;
  }

  return `Call-out $${rate.calloutFee ?? "—"} · Minimum $${rate.minimumCharge ?? "—"}`;
}

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
    prisma.tenantUser.findFirst({
      where: { tenantId: session.tenantId },
      select: { onboardingStep: true, onboardingCompleted: true }
    }),
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
  const pricingSummary = getPricingSummary(pricingModel, rate);

  return (
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Build quotes without turning the page into paperwork."
        description="Pick the customer, describe the work, and let FlowLab turn your pricing setup into a draft that can be reviewed and sent as a branded approval link."
        section="revenue"
        actions={(
          <>
            <Link className="ghost" href="/dashboard/crm">Open CRM</Link>
            <Link className="ghost" href="/dashboard/jobs">Open job board</Link>
          </>
        )}
      />

      {query.created === "1" ? (
        <div className="surface surface-alert is-success">
          <p>Draft quote created and linked to the selected customer{prefilledEnquiryId ? " enquiry" : ""}.</p>
        </div>
      ) : null}

      {needsPricingSetup ? (
        <div className="surface surface-alert is-warning">
          <h2>Set up your pricing first</h2>
          <p>AI quoting uses your pricing rates to calculate the draft amount. Complete pricing in onboarding before generating the first quote.</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/dashboard/onboarding" className="cta">
              Complete setup
            </Link>
          </div>
        </div>
      ) : null}

      <div className="surface">
        <div className="setup-summary">
          <div className="setup-summary-block">
            <div className="setup-summary-label">Quotes on file</div>
            <div className="setup-summary-value">{quotes.length}</div>
            <p className="setup-summary-copy">Recent quote activity across the tenant.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Customers ready to quote</div>
            <div className="setup-summary-value">{customers.length}</div>
            <p className="setup-summary-copy">Anyone in CRM can be priced from this screen.</p>
          </div>
          <div className="setup-summary-block">
            <div className="setup-summary-label">Pricing status</div>
            <div className="setup-summary-value">{pricingConfigured ? "Ready" : "Pending"}</div>
            <p className="setup-summary-copy">{pricingSummary}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="surface form-grid" action="/api/tenant/quotes/generate" method="post">
          <div className="setup-section-copy">
            <div className="eyebrow">Create draft</div>
            <h2 style={{ marginBottom: 8 }}>Start with the job, not the document</h2>
            <p>Drafts should be fast to assemble. The operator only fills in the facts FlowLab cannot infer.</p>
          </div>

          <input type="hidden" name="enquiryId" value={prefilledEnquiryId} />

          <div className="setup-field-grid">
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

            {pricingModel === "area_based" ? (
              <label className="label">
                Area estimate (m²)
                <input className="input" name="areaSquareMetres" type="number" min="1" defaultValue="90" />
              </label>
            ) : pricingModel === "hourly" ? (
              <label className="label">
                Estimated hours
                <input className="input" name="estimatedHours" type="number" min="0.5" step="0.5" defaultValue="2" />
              </label>
            ) : (
              <label className="label">
                Job type
                <input className="input" name="jobType" placeholder="One-off service, recurring visit, clean-up" />
              </label>
            )}

            {pricingModel === "area_based" ? (
              <label className="label">
                Site condition
                <select className="select" name="siteCondition" defaultValue="standard">
                  <option value="standard">Standard</option>
                  <option value="overgrown">Overgrown</option>
                  <option value="heavily_overgrown">Heavily overgrown</option>
                </select>
              </label>
            ) : null}

            <label className="label is-full">
              Service request
              <textarea
                className="textarea"
                name="serviceRequest"
                placeholder="Describe the services to be provided at this property."
                required
                defaultValue={enquiry?.serviceRequest ?? ""}
              />
            </label>
          </div>

          <button className="cta" type="submit" disabled={needsPricingSetup || undefined}>
            Generate draft quote
          </button>
        </form>

        <div className="surface setup-section">
          <div className="setup-section-copy">
            <div className="eyebrow">Quote flow</div>
            <h2 style={{ marginBottom: 8 }}>Keep the operator oriented</h2>
            <p>The right side of the screen should answer three questions quickly: how pricing works, whether this is linked to a live enquiry, and what the customer sees next.</p>
          </div>

          <div className="setup-list">
            <div className="setup-row" style={{ paddingTop: 0, borderTop: 0 }}>
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${pricingConfigured ? "is-on" : "is-warning"}`}>
                    {pricingConfigured ? "Pricing ready" : "Pricing pending"}
                  </span>
                </div>
                <h3>Current pricing basis</h3>
                <p>{pricingSummary}</p>
              </div>
              {!pricingConfigured ? (
                <div className="setup-row-actions">
                  <Link className="ghost" href="/dashboard/onboarding?step=3">Fix pricing</Link>
                </div>
              ) : null}
            </div>

            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className={`status-pill ${enquiry ? "is-warning" : "is-off"}`}>
                    {enquiry ? "Live enquiry" : "Manual draft"}
                  </span>
                </div>
                <h3>Source of this draft</h3>
                <p>
                  {enquiry
                    ? `This quote is linked back to the enquiry received on ${new Date(enquiry.createdAt).toLocaleString()}.`
                    : "You can create a quote directly from CRM or from any enquiry waiting in the customer queue."}
                </p>
              </div>
            </div>

            <div className="setup-row">
              <div className="setup-row-main">
                <div className="setup-row-meta">
                  <span className="status-pill is-off">Customer link</span>
                </div>
                <h3>What happens after review</h3>
                <p>The customer receives a secure branded approval link. Once they accept, FlowLab can carry the work forward into the job and agreement flow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface setup-section">
        <div className="setup-section-header">
          <div className="setup-section-copy">
            <div className="eyebrow">Recent quotes</div>
            <h2>Past drafts should still be easy to reopen and move forward</h2>
            <p>Keep the list dense enough to scan, but let the customer and next useful link remain the primary actions.</p>
          </div>
        </div>

        <div className="setup-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Title</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Links</th>
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
                    {quote.job ? (
                      <>
                        {" · "}
                        <Link href={getJobRecordHref(quote.job.id)}>View job</Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "#64748b", textAlign: "center" }}>
                    No quotes yet. {customers.length === 0 ? "Add a customer in CRM first." : "Create your first one above."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
