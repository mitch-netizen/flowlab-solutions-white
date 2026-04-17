import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantAgreementTemplateBuilderState } from "@flowlab/db";

import DashboardPageScaffold from "../../../../../../components/dashboard/page-scaffold";
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
    <DashboardPageScaffold
      eyebrow="Revenue"
      title={state.template.name}
      description="Place the required signer fields below, then save and validate the template before sending it to customers."
      section="revenue"
      actions={
        <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/agreements">
          Back to agreements
        </Link>
      }
    >
      <div className="cards-2" style={{ alignItems: "start" }}>
        <div className="rounded-lg border bg-card p-4">
          <h2 style={{ marginTop: 0 }}>Checklist</h2>
          <div className="stack">
            <div className="rounded-lg border bg-card/60 p-4">
              <strong>Required roles</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>{state.requirements.requiredRoles.join(", ")}</div>
            </div>
            <div className="rounded-lg border bg-card/60 p-4">
              <strong>Required fields</strong>
              <div style={{ color: "#cbd5e1", marginTop: 8 }}>
                {state.requirements.requiredFields.map((field) => `${field.name} (${field.role})`).join(", ")}
              </div>
            </div>
            <div className="rounded-lg border bg-card/60 p-4">
              <strong>Current status</strong>
              <div style={{ color: state.template.status === "ready" ? "#86efac" : "#fbbf24", marginTop: 8 }}>
                {state.template.status === "ready" ? "Ready" : "Draft"}
              </div>
              {state.template.lastErrorMessage ? (
                <div style={{ color: "#fca5a5", marginTop: 8 }}>{state.template.lastErrorMessage}</div>
              ) : null}
            </div>
            <form action="/api/tenant/agreements/templates/validate" method="post" className="space-y-4">
              <input type="hidden" name="templateId" value={state.template.id} />
              <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                Validate template
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4" style={{ overflow: "hidden" }}>
          <DocuSealBuilderEmbed
            token={state.builderToken}
            roles={state.requirements.requiredRoles}
            requiredFields={state.requirements.requiredFields}
            submitters={state.requirements.requiredRoles.map((role) => ({ role }))}
          />
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
