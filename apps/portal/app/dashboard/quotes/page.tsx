import Link from "next/link";

import { getPricingModel } from "@flowlab/contracts";
import { getTenantCustomers, getTenantQuotes, getTenantSettingsSnapshot } from "@flowlab/db";
import { prisma } from "@flowlab/db";
import { Badge, formatCurrency, formatDateTime, formatLabel, getStatusTone } from "@flowlab/ui";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import SubmitButton from "../../../components/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { getJobRecordHref } from "../../../lib/dashboard-links";
import { requireTenantSession } from "../../../lib/session";
import MarketRateCheck from "./MarketRateCheck";

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

  if (pricingModel === "callout_plus_hourly") {
    return `Call-out $${rate.calloutFee ?? "—"} · $${rate.hourlyRate ?? "—"}/hr · Minimum $${rate.minimumCharge ?? "—"}`;
  }

  return `Call-out $${rate.calloutFee ?? "—"} · Minimum $${rate.minimumCharge ?? "—"}`;
}

export default async function QuotesPage({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string; enquiryId?: string; created?: string; error?: string }>;
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
    (pricingModel === "callout_plus_hourly" && (rate.hourlyRate != null || rate.calloutFee != null)) ||
    (pricingModel === "flat_rate" && (rate.calloutFee != null || rate.minimumCharge != null))
  );
  const onboardingComplete = tenantUser?.onboardingCompleted ?? false;
  const needsPricingSetup = !pricingConfigured && !onboardingComplete;
  const pricingSummary = getPricingSummary(pricingModel, rate);
  const generateErrorMessage: Record<string, string> = {
    customer_id_required: "Please select a customer before generating a quote.",
    service_request_required: "Please add a service request before generating a quote.",
    invalid_area_square_metres: "Area estimate must be greater than 0.",
    invalid_estimated_hours: "Estimated hours must be greater than 0.",
    invalid_site_condition: "Site condition is invalid. Please select a listed option.",
    customer_not_found: "That customer record is no longer available. Please reselect a customer.",
    enquiry_not_found: "That enquiry is no longer available. Open CRM and choose a fresh enquiry.",
    enquiry_customer_mismatch: "The selected enquiry does not match the selected customer.",
    enquiry_already_quoted: "This enquiry is already linked to a quote.",
    ai_quote_limit_reached: "Monthly AI quote limit reached for this plan.",
    quote_generate_failed: "Quote generation failed. Please try again."
  };
  const generateError = query.error ? generateErrorMessage[query.error] ?? "Quote generation failed. Please try again." : null;

  const lastAcceptedQuote = prefilledCustomerId
    ? (quotes.find(q => q.customerId === prefilledCustomerId && q.status === "accepted") ?? null)
    : null;

  return (
    
      <DashboardPageScaffold
        eyebrow="Revenue"
        title="Quotes"
        description="Pick customer, describe work, send quote. FlowLab drafts the pricing and generates a branded approval link."
        section="revenue"
        actions={(
          <>
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/crm">Open CRM</Link>
            <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/jobs">Open job board</Link>
          </>
        )}
      >

      {query.created === "1" ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-emerald-500">
          <p>Draft quote created and linked to the selected customer{prefilledEnquiryId ? " enquiry" : ""}.</p>
        </div>
      ) : null}

      {generateError ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-rose-500">
          <p>{generateError}</p>
        </div>
      ) : null}

      {needsPricingSetup ? (
        <div className="rounded-lg border bg-card p-4 border-l-4 pl-4 border-l-amber-500">
          <h2>Set up your pricing first</h2>
          <p>AI quoting uses your pricing rates to calculate the draft amount. Review pricing in Settings before generating the first quote.</p>
          <div>
            <Link href="/dashboard/settings" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Review pricing
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Quotes on file</div>
            <div className="text-3xl font-semibold">{quotes.length}</div>
            <p className="text-sm text-muted-foreground">{quotes.filter(q => q.status === "pending" || q.status === "draft").length} pending · {quotes.filter(q => q.status === "accepted").length} accepted.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Customers in CRM</div>
            <div className="text-3xl font-semibold">{customers.length}</div>
            <p className="text-sm text-muted-foreground">{customers.length === 0 ? "Add customers in CRM before quoting." : "Any customer can be quoted from this screen."}</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pricing status</div>
            <div className="text-3xl font-semibold">{pricingConfigured ? "Ready" : "Pending"}</div>
            <p className="text-sm text-muted-foreground">{pricingSummary}</p>
          </div>
        </div>
      </div>

      <div className="cards-2">
        <form className="rounded-lg border bg-card p-4 space-y-4" action="/api/tenant/quotes/generate" method="post">
          <div className="space-y-2">
            <div className="eyebrow">Create draft</div>
            <h2>Fill in what FlowLab can&apos;t infer</h2>
            <p>Only the facts you know: customer, work description, and the key pricing input. Everything else comes from your settings.</p>
          </div>

          {customers.length === 0 ? (
            <div className="rounded-lg border bg-card/60 p-4 space-y-2">
              <p className="text-sm font-medium">No customers in CRM yet</p>
              <p className="text-sm text-muted-foreground">Add a customer first, then return here to create a quote.</p>
              <Link href="/dashboard/crm#manual-add" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs font-semibold">Add customer in CRM</Link>
            </div>
          ) : null}

          <input type="hidden" name="enquiryId" value={prefilledEnquiryId} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Customer
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="customerId" required defaultValue={prefilledCustomerId} disabled={customers.length === 0 || undefined}>
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
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Area estimate (m²)
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="areaSquareMetres" type="number" min="1" defaultValue="90" title="Square metres of the service area (lawn, roof, etc.). Adjust for larger or smaller properties." />
                <span className="text-xs text-muted-foreground">Square metres of the area to be serviced. Default 90m² — adjust to match the site.</span>
              </label>
            ) : pricingModel === "hourly" || pricingModel === "callout_plus_hourly" ? (
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Estimated hours
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="estimatedHours" type="number" min="0.5" step="0.5" defaultValue="2" title="How long the job is expected to take. Used to calculate the quote amount and job duration estimate." />
                <span className="text-xs text-muted-foreground">How long the job should take. Used to calculate the quote total.</span>
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Job type
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="jobType" placeholder="One-off service, recurring visit, clean-up" />
              </label>
            )}

            {pricingModel === "area_based" ? (
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Site condition
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="siteCondition" defaultValue="standard">
                  <option value="standard">Standard</option>
                  <option value="overgrown">Overgrown</option>
                  <option value="heavily_overgrown">Heavily overgrown</option>
                </select>
              </label>
            ) : null}

            <label className="flex flex-col gap-2 text-sm text-muted-foreground md:col-span-2">
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

          <SubmitButton className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" loadingText="Generating…" disabled={needsPricingSetup || undefined}>
            Generate draft quote
          </SubmitButton>
        </form>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="eyebrow">Quote flow</div>
            <h2>Pricing, source, and what the customer sees</h2>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${pricingConfigured ? "is-on" : "is-warning"}`} title={pricingConfigured ? "AI quoting will use these rates to calculate the draft amount." : "Set up pricing in Settings before generating quotes."}>
                    {pricingConfigured ? "Pricing ready" : "Pricing not configured"}
                  </span>
                </div>
                <h3>Your pricing basis</h3>
                <p>{pricingSummary}</p>
              </div>
              {!pricingConfigured ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/settings">Set up pricing</Link>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={`status-pill ${enquiry ? "is-warning" : "is-off"}`} title={enquiry ? "Linked to a customer request — accepting this quote will move the job forward automatically." : "Not linked to a customer request. Quote will be standalone."}>
                    {enquiry ? "Live enquiry" : "Manual draft"}
                  </span>
                </div>
                <h3>Source</h3>
                <p>
                  {enquiry
                    ? `Linked to an enquiry from ${formatDateTime(enquiry.createdAt)}. Accepting carries the work into the job flow automatically.`
                    : "Not linked to an enquiry. Create from CRM or from any open customer request."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="status-pill is-off" title="After you review the draft, the customer gets a secure branded link to review and accept.">Customer link</span>
                </div>
                <h3>What the customer sees</h3>
                <p>A secure branded approval link. Once accepted, FlowLab moves the work forward into scheduling and invoicing.</p>
              </div>
            </div>

            {prefilledCustomerId ? (
              <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="status-pill is-off">Customer history</span>
                  </div>
                  <h3>Past quotes</h3>
                  <p>
                    {lastAcceptedQuote
                      ? `Last accepted: "${lastAcceptedQuote.title}" — $${lastAcceptedQuote.amount} on ${formatDateTime(lastAcceptedQuote.acceptedAt ?? lastAcceptedQuote.createdAt)}`
                      : "No accepted quotes on file for this customer yet."}
                  </p>
                </div>
              </div>
            ) : null}

            <MarketRateCheck />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="eyebrow">Recent quotes</div>
            <h2>All quotes</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <CustomerLink customerId={quote.customer.id} className="inline-entity-link">
                      {quote.customer.firstName} {quote.customer.lastName}
                    </CustomerLink>
                  </TableCell>
                  <TableCell>{quote.title}</TableCell>
                  <TableCell><Badge tone={getStatusTone(quote.status)}>{formatLabel(quote.status)}</Badge></TableCell>
                  <TableCell>{formatCurrency(quote.amount)}</TableCell>
                  <TableCell>
                    <Link href={`/quote/${quote.accessToken}`}>Open quote</Link>
                    {quote.job ? (
                      <>
                        {" · "}
                        <Link href={getJobRecordHref(quote.job.id)}>View job</Link>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-slate-500 text-center">
                    {customers.length === 0
                      ? "Add customers in CRM first, then create a quote above."
                      : "No quotes yet — fill in the form above to generate your first draft."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
