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
        <p style={{ color: "#cbd5e1" }}>Upload your own service agreement once, make it the default, and FlowLab will send that contract for signature whenever a customer approves a quote.</p>
      </div>
      <div className="cards-2">
        <form action="/api/tenant/agreements/templates/upload" method="post" encType="multipart/form-data" className="surface form-grid">
          <h2 style={{ marginTop: 0 }}>Upload your agreement template</h2>
          <div className="surface-soft">
            Upload a PDF or DOCX version of your legal contract. For the best result, include DocuSeal fields or tags for a <strong>Customer</strong> signer, and optionally a <strong>Business</strong> countersigner.
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
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Saved agreement templates</h2>
          <div className="stack">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="surface-soft">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <strong>{template.name}</strong>
                      <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                        {template.sourceFileName} · {template.signerMode === "customer_and_business" ? "Customer + business" : "Customer only"} · {template.status}
                      </div>
                      {template.isDefault ? <div style={{ color: "#86efac", marginTop: 8 }}>Default template</div> : null}
                      {template.lastErrorMessage ? <div style={{ color: "#fca5a5", marginTop: 8 }}>{template.lastErrorMessage}</div> : null}
                    </div>
                    {!template.isDefault ? (
                      <form action="/api/tenant/agreements/templates/default" method="post">
                        <input type="hidden" name="templateId" value={template.id} />
                        <button className="ghost" type="submit">
                          Make default
                        </button>
                      </form>
                    ) : null}
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
            {!defaultTemplate ? (
              <div className="surface-soft">
                Upload and set a default agreement template first. Once that&apos;s done, accepted quotes here can be sent for signature in one click.
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
                  <button className="cta" type="submit" disabled={!defaultTemplate}>
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
