import Link from "next/link";

import { getTenantAgreements, getTenantAgreementTemplates, getTenantQuotes } from "@flowlab/db";

import CustomerLink from "../../../components/customer-link";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";

export default async function AgreementsPage() {
  const session = await requireTenantSession();
  const [agreements, quotes, templates] = await Promise.all([
    getTenantAgreements(session.tenantId),
    getTenantQuotes(session.tenantId),
    getTenantAgreementTemplates(session.tenantId)
  ]);

  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted");
  const defaultTemplate = templates.find((template) => template.isDefault) ?? null;

  return (
    
      <DashboardPageScaffold
        eyebrow="Revenue"
        title="Turn accepted quotes into signed agreements."
        description="Upload a contract or generate one, set up the signer fields, and mark a template as default. It will be sent automatically when a quote is accepted."
        section="revenue"
      >
      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4 stack">
          <form action="/api/tenant/agreements/templates/upload" method="post" encType="multipart/form-data" className="space-y-4">
            <h2 style={{ marginTop: 0 }}>Upload your agreement template</h2>
            <div className="rounded-lg border bg-card/60 p-4">
              Upload a PDF or DOCX of your service contract. You&apos;ll be taken into the builder to place the required signature and date fields before the template goes live.
            </div>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Template name
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="templateName" placeholder="Standard service agreement" required />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Signer setup
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="signerMode" defaultValue="customer_only">
                <option value="customer_only">Customer signs only</option>
                <option value="customer_and_business">Customer plus business countersign</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Contract file
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="templateFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
            </label>
            <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
              Upload to DocuSeal
            </button>
          </form>
          <form action="/api/tenant/agreements/templates/generate" method="post" className="space-y-4">
            <h2 style={{ marginTop: 0 }}>Generate a smart agreement</h2>
            <div className="rounded-lg border bg-card/60 p-4">
              Generate a ready-made service agreement that already includes customer, property, quote amount, and signing fields. You can still open the builder afterward to adjust wording or layout.
            </div>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Smart template name
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="templateName" placeholder="Smart Service Agreement" />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              Smart signer setup
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="signerMode" defaultValue="customer_only">
                <option value="customer_only">Customer signs only</option>
                <option value="customer_and_business">Customer plus business countersign</option>
              </select>
            </label>
            <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
              Generate smart template
            </button>
          </form>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Saved agreement templates</h2>
          <div className="stack">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="rounded-lg border bg-card/60 p-4">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <strong>{template.name}</strong>
                      <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                        {template.sourceFileName} · {template.signerMode === "customer_and_business" ? "Customer + business" : "Customer only"}
                      </div>
                      <div style={{ color: template.status === "ready" ? "#86efac" : "#fbbf24", marginTop: 8 }}>
                        {template.status === "ready" ? "Ready for signing" : "Draft — builder setup still required"}
                      </div>
                      {template.isDefault ? <div style={{ color: "#86efac", marginTop: 8 }}>Default template</div> : null}
                      {template.lastErrorMessage ? <div style={{ color: "#fca5a5", marginTop: 8 }}>{template.lastErrorMessage}</div> : null}
                    </div>
                    <div className="stack" style={{ minWidth: 180 }}>
                      <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href={`/dashboard/agreements/templates/${template.id}/builder`}>
                        Open builder
                      </Link>
                      <form action="/api/tenant/agreements/templates/validate" method="post">
                        <input type="hidden" name="templateId" value={template.id} />
                        <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
                          Validate template
                        </button>
                      </form>
                      {!template.isDefault && template.status === "ready" ? (
                        <form action="/api/tenant/agreements/templates/default" method="post">
                          <input type="hidden" name="templateId" value={template.id} />
                          <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
                            Make default
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border bg-card/60 p-4">No contract templates yet. Upload your service agreement to start sending real customer sign-offs.</div>
            )}
          </div>
        </div>
      </div>
      <div className="cards-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Accepted quotes ready for agreements</h2>
          <div className="stack">
            {!defaultTemplate || defaultTemplate.status !== "ready" ? (
              <div className="rounded-lg border bg-card/60 p-4">
                Upload a contract, finish the builder step, and validate it before sending agreements from accepted quotes.
              </div>
            ) : null}
            {acceptedQuotes.length > 0 ? (
              acceptedQuotes.map((quote) => (
                <form key={quote.id} action="/api/tenant/agreements/create" method="post" className="rounded-lg border bg-card/60 p-4 space-y-4">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <strong>{quote.title}</strong>
                  <div style={{ color: "#cbd5e1" }}>
                    <CustomerLink customerId={quote.customer.id} className="inline-entity-link">
                      {quote.customer.firstName} {quote.customer.lastName}
                    </CustomerLink>
                    {" "}· ${quote.amount}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Using: {defaultTemplate?.name ?? "Legacy generated agreement"}
                  </div>
                  <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit" disabled={!defaultTemplate || defaultTemplate.status !== "ready"}>
                    Send agreement
                  </button>
                </form>
              ))
            ) : (
              <div className="rounded-lg border bg-card/60 p-4">Accepted quotes will appear here once customers approve them.</div>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Agreement status</h2>
          <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
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
                    <CustomerLink customerId={agreement.customer.id} className="inline-entity-link">
                      {agreement.customer.firstName} {agreement.customer.lastName}
                    </CustomerLink>
                  </td>
                  <td>
                    <Link href={`/sign/${agreement.accessToken}`}>Open sign page</Link>
                    {agreement.contractTemplate ? (
                      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{agreement.contractTemplate.name}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
