import Link from "next/link";

import { getTenantAgreements, getTenantAgreementTemplates, getTenantQuotes } from "@flowlab/db";

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
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Agreements</div>
        <h1>Get your agreements signed — fast.</h1>
        <p style={{ color: "#cbd5e1" }}>Upload your own contract, place the required signer fields in the builder, then mark it ready. Once a default template is ready, FlowLab will use it automatically whenever a customer accepts a quote.</p>
      </div>
      <div className="cards-2">
        <div className="surface stack">
          <form action="/api/tenant/agreements/templates/upload" method="post" encType="multipart/form-data" className="form-grid">
            <h2 style={{ marginTop: 0 }}>Upload your agreement template</h2>
            <div className="surface-soft">
              Upload a PDF or DOCX version of your legal contract. FlowLab will send you straight into the builder so you can place the required signature and date fields before the template goes live.
            </div>
            <label className="label">
              Template name
              <input className="input" name="templateName" placeholder="Standard service agreement" required />
            </label>
            <label className="label">
              Signer setup
              <select className="input" name="signerMode" defaultValue="customer_only">
                <option value="customer_only">Customer signs only</option>
                <option value="customer_and_business">Customer plus business countersign</option>
              </select>
            </label>
            <label className="label">
              Contract file
              <input className="input" name="templateFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
            </label>
            <button className="cta" type="submit">
              Upload to DocuSeal
            </button>
          </form>
          <form action="/api/tenant/agreements/templates/generate" method="post" className="form-grid">
            <h2 style={{ marginTop: 0 }}>Generate a smart agreement</h2>
            <div className="surface-soft">
              Start with a FlowLab-built service agreement that already includes customer, property, quote amount, and signing fields. You can still open the builder afterward to tweak wording or layout.
            </div>
            <label className="label">
              Smart template name
              <input className="input" name="templateName" placeholder="FlowLab Smart Service Agreement" />
            </label>
            <label className="label">
              Smart signer setup
              <select className="input" name="signerMode" defaultValue="customer_only">
                <option value="customer_only">Customer signs only</option>
                <option value="customer_and_business">Customer plus business countersign</option>
              </select>
            </label>
            <button className="ghost" type="submit">
              Generate smart template
            </button>
          </form>
        </div>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Saved agreement templates</h2>
          <div className="stack">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="surface-soft">
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
                      <Link className="ghost" href={`/dashboard/agreements/templates/${template.id}/builder`}>
                        Open builder
                      </Link>
                      <form action="/api/tenant/agreements/templates/validate" method="post">
                        <input type="hidden" name="templateId" value={template.id} />
                        <button className="ghost" type="submit">
                          Validate template
                        </button>
                      </form>
                      {!template.isDefault && template.status === "ready" ? (
                        <form action="/api/tenant/agreements/templates/default" method="post">
                          <input type="hidden" name="templateId" value={template.id} />
                          <button className="ghost" type="submit">
                            Make default
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-soft">No contract templates yet. Upload your service agreement to start sending real customer sign-offs.</div>
            )}
          </div>
        </div>
      </div>
      <div className="cards-2">
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Accepted quotes ready for agreements</h2>
          <div className="stack">
            {!defaultTemplate || defaultTemplate.status !== "ready" ? (
              <div className="surface-soft">
                Upload a contract, finish the builder step, and validate it before sending agreements from accepted quotes.
              </div>
            ) : null}
            {acceptedQuotes.length > 0 ? (
              acceptedQuotes.map((quote) => (
                <form key={quote.id} action="/api/tenant/agreements/create" method="post" className="surface-soft form-grid">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <strong>{quote.title}</strong>
                  <div style={{ color: "#cbd5e1" }}>
                    {quote.customer.firstName} {quote.customer.lastName} · ${quote.amount}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Using: {defaultTemplate?.name ?? "Legacy generated agreement"}
                  </div>
                  <button className="cta" type="submit" disabled={!defaultTemplate || defaultTemplate.status !== "ready"}>
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
    </div>
  );
}
