import Link from "next/link";

import AdminPageScaffold, { AdminPageCard } from "../../../../components/admin/page-scaffold";
import { requirePlatformSession } from "../../../../lib/session";
import { CreateTenantForm } from "./create-tenant-form";

export default async function NewTenantPage() {
  await requirePlatformSession();

  return (
    <AdminPageScaffold
      title="Create tenant"
      description="Create a FlowLab workspace, owner account, and starting subscription profile from the admin console."
      meta={<Link href="/admin" className="marketing-link">Back to dashboard</Link>}
    >
      <section className="hero app-hero">
        <AdminPageCard>
          <div className="hero-badge">New workspace</div>
          <h2>Launch a tenant from FlowLab admin.</h2>
          <p className="muted">
            This creates the tenant record and owner user. After creation, open the tenant record to send auth links,
            connect Stripe, impersonate, or complete support setup.
          </p>
        </AdminPageCard>
        <AdminPageCard>
          <CreateTenantForm />
        </AdminPageCard>
      </section>
    </AdminPageScaffold>
  );
}
