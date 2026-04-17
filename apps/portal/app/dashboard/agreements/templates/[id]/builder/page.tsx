import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantAgreementTemplateBuilderState } from "@flowlab/db";

import { requireTenantSession } from "../../../../../../lib/session";
import DocuSealBuilderEmbed from "../DocuSealBuilderEmbed";

export default async function AgreementTemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  let state;
  try {
    state = await getTenantAgreementTemplateBuilderState({
      tenantId: session.tenantId,
      templateId: id,
      integrationEmail: session.email
    });
  } catch {
    notFound();
  }

  return (
    <div className="stack">
      <div className="surface">
        <div className="eyebrow">Agreement Builder</div>
        <h1>{state.template.name}</h1>
        <p style={{ color: "#cbd5e1" }}>
          Place the required signer fields below, then save and validate the template before sending it to customers.
        </p>
      </div>

      <div className="cards-2" style={{ alignItems: "start" }}>
        <div className="surface">
          <h2 style={{ marginTop: 0 }}>Checklist</h2>
          <div className="stack">
            <div className="surface-soft">
              <strong>Required roles</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{state.requirements.requiredRoles.join(", ")}</div>
            </div>
            <div className="surface-soft">
              <strong>Required fields</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                {state.requirements.requiredFields.map((field) => `${field.name} (${field.role})`).join(", ")}
              </div>
            </div>
            <div className="surface-soft">
              <strong>Current status</strong>
              <div style={{ color: state.template.status === "ready" ? "#86efac" : "#fbbf24", marginTop: 8 }}>
                {state.template.status === "ready" ? "Ready" : "Draft"}
              </div>
              {state.template.lastErrorMessage ? (
                <div style={{ color: "#fca5a5", marginTop: 8 }}>{state.template.lastErrorMessage}</div>
              ) : null}
            </div>
            <form action="/api/tenant/agreements/templates/validate" method="post" className="form-grid">
              <input type="hidden" name="templateId" value={state.template.id} />
              <button className="cta" type="submit">
                Validate template
              </button>
            </form>
            <Link className="ghost" href="/dashboard/agreements">
              Back to agreements
            </Link>
          </div>
        </div>

        <div className="surface" style={{ overflow: "hidden" }}>
          <DocuSealBuilderEmbed
            token={state.builderToken}
            roles={state.requirements.requiredRoles}
            requiredFields={state.requirements.requiredFields}
            submitters={state.requirements.requiredRoles.map((role) => ({ role }))}
          />
        </div>
      </div>
    </div>
  );
}
