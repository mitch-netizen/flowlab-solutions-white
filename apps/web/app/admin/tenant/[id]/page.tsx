"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getServiceLabel, serviceLabels } from "@flowlab/contracts";
import AdminPageScaffold, { AdminPageCard } from "../../../../components/admin/page-scaffold";

interface TenantDetail {
  id: string;
  slug: string;
  status: string;
  plan: string;
  monthlyFee: number;
  trialEndsAt: string | null;
  billingEmail: string | null;
  createdAt: string;
  notes: string | null;
  profile: {
    businessName: string;
    businessType: string;
    phone: string | null;
    email: string | null;
    suburb: string | null;
    state: string | null;
    abn: string | null;
    primaryColour: string;
  } | null;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
    lastLoginAt: string | null;
  }>;
  integrations: Array<{
    id: string;
    service: string;
    status: string;
    lastTestedAt: string | null;
    lastTestResult: string | null;
    lastErrorMessage: string | null;
  }>;
  events: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    service: string;
    direction: string;
    status: string;
    requestSummary: string | null;
    errorMessage: string | null;
    durationMs: number | null;
  }>;
  _count: {
    jobs: number;
    invoices: number;
    customers: number;
  };
}

type TabId = "overview" | "integrations" | "events" | "billing" | "settings" | "impersonate";

const STATUS_COLOURS: Record<string, string> = {
  active: "#16a34a",
  trial: "#d97706",
  suspended: "#dc2626",
  cancelled: "#64748b"
};

const INTEGRATION_COLOURS: Record<string, string> = {
  connected: "#16a34a",
  not_configured: "#64748b",
  error: "#dc2626",
  disconnected: "#94a3b8"
};

export default function TenantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = params?.id as string;

  const [tab, setTab] = useState<TabId>((searchParams?.get("tab") as TabId) ?? "overview");
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    businessName: "",
    plan: "starter",
    status: "trial",
    monthlyFee: 79,
    notes: ""
  });

  useEffect(() => {
    fetch(`/api/admin/tenants/${tenantId}`)
      .then((r) => r.json())
      .then(({ tenant: t }) => {
        setTenant(t);
        setSettingsForm({
          businessName: t.profile?.businessName ?? t.slug,
          plan: t.plan,
          status: t.status,
          monthlyFee: t.monthlyFee,
          notes: t.notes ?? ""
        });
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleImpersonate = async () => {
    if (!confirm(`Log in as ${tenant?.profile?.businessName ?? tenant?.slug}? This action is logged.`)) return;
    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId })
      });
      const data = (await res.json()) as { ok?: boolean; portalUrl?: string; error?: string };
      if (data.ok && data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      } else {
        alert(data.error ?? "Impersonation failed");
      }
    } finally {
      setImpersonating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        alert("Settings saved.");
        router.refresh();
      } else {
        alert(data.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageScaffold title="Tenant details" description="Loading tenant record.">
        <AdminPageCard>Loading tenant...</AdminPageCard>
      </AdminPageScaffold>
    );
  }

  if (!tenant) {
    return (
      <AdminPageScaffold title="Tenant details" description="Unable to load tenant record.">
        <AdminPageCard>Tenant not found.</AdminPageCard>
      </AdminPageScaffold>
    );
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "integrations", label: "Integrations" },
    { id: "events", label: "Event Log" },
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
    { id: "impersonate", label: "Impersonate" }
  ];

  return (
    <AdminPageScaffold
      title={tenant.profile?.businessName ?? tenant.slug}
      description={`${tenant.slug}.flowlabsolutions.au | ${tenant.status.toUpperCase()} | ${tenant.plan} plan`}
      meta={<a href="/admin" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Tenants</a>}
      actions={(
        <button
          onClick={handleImpersonate}
          disabled={impersonating}
          className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          style={{ background: "#7c3aed", opacity: impersonating ? 0.6 : 1 }}
        >
          {impersonating ? "Opening..." : "Impersonate →"}
        </button>
      )}
    >

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1e293b", marginBottom: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 16px",
                color: tab === t.id ? "#3b82f6" : "#94a3b8",
                fontWeight: tab === t.id ? 600 : 400,
                borderBottom: tab === t.id ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="panel">
          {tab === "overview" && (
            <div className="grid">
              <div className="metrics">
                <div className="metric">
                  <span className="muted">Customers</span>
                  <strong>{tenant._count.customers}</strong>
                </div>
                <div className="metric">
                  <span className="muted">Jobs</span>
                  <strong>{tenant._count.jobs}</strong>
                </div>
                <div className="metric">
                  <span className="muted">Invoices</span>
                  <strong>{tenant._count.invoices}</strong>
                </div>
                <div className="metric">
                  <span className="muted">Monthly fee</span>
                  <strong>${tenant.monthlyFee}/mo</strong>
                </div>
              </div>
              <div>
                <h3 style={{ marginBottom: 12 }}>Operator accounts</h3>
                {tenant.users.map((u) => (
                  <div key={u.id} className="panel-soft" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <strong>{u.firstName} {u.lastName}</strong>{" "}
                        <span className="muted">({u.email})</span>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {u.onboardingCompleted
                          ? "✅ Onboarding complete"
                          : `🔄 Onboarding step ${u.onboardingStep}/6`}
                        &nbsp;|&nbsp;
                        Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {tenant.profile && (
                <div>
                  <h3 style={{ marginBottom: 12 }}>Business details</h3>
                  <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
                    <tbody>
                      {[
                        ["Type", tenant.profile.businessType.replace(/_/g, " ")],
                        ["Phone", tenant.profile.phone ?? "—"],
                        ["Email", tenant.profile.email ?? "—"],
                        ["Location", [tenant.profile.suburb, tenant.profile.state].filter(Boolean).join(", ") || "—"],
                        ["ABN", tenant.profile.abn ?? "—"],
                        ["Brand colour", tenant.profile.primaryColour]
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td className="muted" style={{ width: "30%" }}>{label}</td>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="muted" style={{ fontSize: 13 }}>
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
                {tenant.trialEndsAt && ` | Trial ends: ${new Date(tenant.trialEndsAt).toLocaleDateString()}`}
              </div>
            </div>
          )}

          {tab === "integrations" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Integration health</h3>
              <div className="grid">
                {tenant.integrations.length === 0 && (
                  <p className="muted">No integrations configured yet.</p>
                )}
                {tenant.integrations.map((integration) => (
                  <div key={integration.id} className="panel-soft">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <strong>{serviceLabels[integration.service as keyof typeof serviceLabels] ?? getServiceLabel(integration.service)}</strong>
                      </div>
                      <span
                        style={{
                          background: INTEGRATION_COLOURS[integration.status] ?? "#64748b",
                          color: "#fff",
                          padding: "2px 10px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        {integration.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                    {integration.lastTestedAt && (
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                        Last tested: {new Date(integration.lastTestedAt).toLocaleString()}
                        {integration.lastTestResult && ` — ${integration.lastTestResult}`}
                      </p>
                    )}
                    {integration.lastErrorMessage && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#dc2626" }}>
                        {integration.lastErrorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "events" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Recent event log</h3>
              {tenant.events.length === 0 && <p className="muted">No events recorded yet.</p>}
              <div className="grid">
                {tenant.events.map((event) => (
                  <div
                    key={event.id}
                    className="panel-soft"
                    style={{ borderLeft: event.status === "failed" ? "3px solid #dc2626" : "3px solid transparent" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{getServiceLabel(event.service)}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{event.eventType}</span>
                        <span
                          style={{
                            color: event.status === "success" ? "#16a34a" : event.status === "failed" ? "#dc2626" : "#d97706",
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {event.status}
                        </span>
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {new Date(event.createdAt).toLocaleString()}
                        {event.durationMs != null && ` · ${event.durationMs}ms`}
                      </span>
                    </div>
                    {event.requestSummary && (
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                        {event.requestSummary}
                      </p>
                    )}
                    {event.errorMessage && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#dc2626" }}>
                        {event.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "billing" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Billing & subscription</h3>
              <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
                <tbody>
                  {[
                    ["Plan", tenant.plan],
                    ["Status", tenant.status],
                    ["Monthly fee", `$${tenant.monthlyFee}/month`],
                    ["Billing email", tenant.billingEmail ?? "—"],
                    ["Trial ends", tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : "N/A"],
                    ["Member since", new Date(tenant.createdAt).toLocaleDateString()]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="muted" style={{ width: "35%" }}>{label}</td>
                      <td style={{ fontWeight: 600 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "settings" && (
            <div style={{ maxWidth: 480 }}>
              <h3 style={{ marginBottom: 16 }}>Edit tenant</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Business name</div>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={settingsForm.businessName}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, businessName: e.target.value }))}
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Plan</div>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={settingsForm.plan}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, plan: e.target.value }))}
                  >
                    <option value="starter">Starter — $79/mo</option>
                    <option value="professional">Professional — $149/mo</option>
                    <option value="growth">Growth — $249/mo</option>
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Status</div>
                  <select
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={settingsForm.status}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Monthly fee (AUD)</div>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    type="number"
                    value={settingsForm.monthlyFee}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, monthlyFee: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Internal notes</div>
                  <textarea
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    rows={3}
                    value={settingsForm.notes}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, notes: e.target.value }))}
                    style={{ resize: "vertical" }}
                  />
                </label>
                <button
                  className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{ alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          )}

          {tab === "impersonate" && (
            <div>
              <h3 style={{ marginBottom: 12 }}>Impersonate tenant operator</h3>
              <p className="muted" style={{ marginBottom: 20 }}>
                Opens the tenant&apos;s operator dashboard in a new tab using their session. This action is logged as an audit
                event.
              </p>
              <div className="panel-soft" style={{ marginBottom: 20 }}>
                <p style={{ margin: 0 }}>
                  <strong>Tenant:</strong> {tenant.profile?.businessName ?? tenant.slug}
                  <br />
                  <strong>Operator:</strong>{" "}
                  {tenant.users[0] ? `${tenant.users[0].firstName} ${tenant.users[0].lastName} (${tenant.users[0].email})` : "No users"}
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={handleImpersonate}
                disabled={impersonating || tenant.users.length === 0}
                style={{ background: "#7c3aed", opacity: impersonating ? 0.6 : 1 }}
              >
                {impersonating ? "Starting impersonation..." : "Open as this operator →"}
              </button>
            </div>
          )}
        </div>
    </AdminPageScaffold>
  );
}
