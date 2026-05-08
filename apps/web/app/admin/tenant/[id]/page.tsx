"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getServiceLabel, serviceLabels } from "@flowlab/contracts";
import AdminPageScaffold, { AdminPageCard } from "../../../../components/admin/page-scaffold";
import { Badge, formatCurrency, formatDate, formatDateTime, formatLabel, getStatusTone } from "@flowlab/ui";

interface TenantDetail {
  id: string;
  slug: string;
  status: string;
  plan: string;
  monthlyFee: number;
  trialEndsAt: string | null;
  billingEmail: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripePriceId: string | null;
  subscriptionStartDate: string | null;
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
    authUserId: string | null;
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
    triggeredBy: string | null;
  }>;
  enquiries: Array<{
    id: string;
    createdAt: string;
    serviceRequest: string;
    status: string;
    source: string;
    convertedAt: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      suburb: string | null;
    };
    quote: {
      id: string;
      title: string;
      amount: number;
      status: string;
    } | null;
  }>;
  _count: {
    jobs: number;
    invoices: number;
    customers: number;
    enquiries: number;
  };
}

type TabId = "overview" | "users" | "enquiries" | "integrations" | "events" | "billing" | "settings" | "impersonate";

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
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [supportNote, setSupportNote] = useState("");
  const [supportKind, setSupportKind] = useState<"note" | "task">("note");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [enquiryStatus, setEnquiryStatus] = useState("all");
  const [eventSearch, setEventSearch] = useState("");
  const [eventStatus, setEventStatus] = useState("all");
  const [settingsForm, setSettingsForm] = useState({
    businessName: "",
    plan: "starter",
    status: "trial",
    monthlyFee: 79,
    billingEmail: "",
    stripeCustomerId: "",
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
          billingEmail: t.billingEmail ?? "",
          stripeCustomerId: t.stripeCustomerId ?? "",
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

  const refreshTenant = async () => {
    const response = await fetch(`/api/admin/tenants/${tenantId}`);
    const data = (await response.json()) as { tenant?: TenantDetail };
    if (data.tenant) {
      setTenant(data.tenant);
      setSettingsForm({
        businessName: data.tenant.profile?.businessName ?? data.tenant.slug,
        plan: data.tenant.plan,
        status: data.tenant.status,
        monthlyFee: data.tenant.monthlyFee,
        billingEmail: data.tenant.billingEmail ?? "",
        stripeCustomerId: data.tenant.stripeCustomerId ?? "",
        notes: data.tenant.notes ?? ""
      });
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

  const handlePasswordReset = async (userId: string) => {
    setResettingUserId(userId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = (await res.json()) as { ok?: boolean; actionLink?: string; email?: string; error?: string };
      if (!data.ok || !data.actionLink) {
        alert(data.error ?? "Could not generate reset link");
        return;
      }
      await navigator.clipboard?.writeText(data.actionLink);
      alert(`Password reset link generated for ${data.email}. It has been copied to your clipboard.`);
    } finally {
      setResettingUserId(null);
    }
  };

  const handleCreateStripeCustomer = async () => {
    setBillingBusy("customer");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing/stripe-customer`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; customerId?: string; error?: string };
      if (!data.ok) {
        alert(data.error ?? "Could not create Stripe customer");
        return;
      }
      alert(`Stripe customer linked: ${data.customerId}`);
      await refreshTenant();
    } finally {
      setBillingBusy(null);
    }
  };

  const handleOpenStripePortal = async () => {
    setBillingBusy("portal");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing/stripe-portal`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        alert(data.error ?? "Could not open Stripe billing portal");
        return;
      }
      window.open(data.url, "_blank");
    } finally {
      setBillingBusy(null);
    }
  };

  const handleStartStripeCheckout = async () => {
    setBillingBusy("checkout");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing/stripe-checkout`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        alert(data.error ?? "Could not start Stripe checkout");
        return;
      }
      window.open(data.url, "_blank");
    } finally {
      setBillingBusy(null);
    }
  };

  const handleSupportNote = async () => {
    if (!supportNote.trim()) return;
    const res = await fetch(`/api/admin/tenants/${tenantId}/support-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: supportNote, kind: supportKind })
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!data.ok) {
      alert(data.error ?? "Could not add support note");
      return;
    }
    setSupportNote("");
    await refreshTenant();
    setTab("events");
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
    { id: "users", label: "Users & Auth" },
    { id: "enquiries", label: "Enquiries" },
    { id: "integrations", label: "Integrations" },
    { id: "events", label: "Event Log" },
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
    { id: "impersonate", label: "Impersonate" }
  ];

  const filteredEnquiries = tenant.enquiries.filter((enquiry) => {
    const text = `${enquiry.customer.firstName} ${enquiry.customer.lastName} ${enquiry.customer.email} ${enquiry.customer.phone ?? ""} ${enquiry.serviceRequest}`.toLowerCase();
    const matchesSearch = !enquirySearch.trim() || text.includes(enquirySearch.trim().toLowerCase());
    const matchesStatus = enquiryStatus === "all" || enquiry.status === enquiryStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredEvents = tenant.events.filter((event) => {
    const text = `${event.service} ${event.eventType} ${event.requestSummary ?? ""} ${event.errorMessage ?? ""} ${event.triggeredBy ?? ""}`.toLowerCase();
    const matchesSearch = !eventSearch.trim() || text.includes(eventSearch.trim().toLowerCase());
    const matchesStatus = eventStatus === "all" || event.status === eventStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminPageScaffold
      title={tenant.profile?.businessName ?? tenant.slug}
      description={`${tenant.slug}.flowlabsolutions.au | ${formatLabel(tenant.status)} | ${tenant.plan} plan`}
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
                  <span className="muted">Enquiries</span>
                  <strong>{tenant._count.enquiries}</strong>
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
                  <strong>{formatCurrency(tenant.monthlyFee)}/mo</strong>
                </div>
              </div>
              <div>
                <h3 style={{ marginBottom: 12 }}>Latest enquiries</h3>
                {tenant.enquiries.slice(0, 5).length === 0 ? <p className="muted">No enquiries yet.</p> : null}
                {tenant.enquiries.slice(0, 5).map((enquiry) => (
                  <div key={enquiry.id} className="panel-soft" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{enquiry.customer.firstName} {enquiry.customer.lastName}</strong>
                      <Badge tone={enquiry.status === "new" ? "warning" : "neutral"}>{formatLabel(enquiry.status)}</Badge>
                    </div>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{enquiry.serviceRequest}</p>
                  </div>
                ))}
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
                          : `🔄 Onboarding step ${u.onboardingStep}/3`}
                        &nbsp;|&nbsp;
                        Last login: {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
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
                Created: {formatDate(tenant.createdAt)}
                {tenant.trialEndsAt && ` | Trial ends: ${formatDate(tenant.trialEndsAt)}`}
              </div>
            </div>
          )}

          {tab === "users" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Users & auth support</h3>
              <div className="grid">
                {tenant.users.map((u) => (
                  <div key={u.id} className="panel-soft">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <strong>{u.firstName} {u.lastName}</strong>
                        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                          {u.email} | {formatLabel(u.role)} | {u.authUserId ? "Supabase auth linked" : "Legacy auth"}
                        </p>
                        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                          Last login: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"} | Onboarding: {u.onboardingCompleted ? "complete" : `step ${u.onboardingStep}/3`}
                        </p>
                      </div>
                      <button
                        className="cta ghost"
                        type="button"
                        disabled={!u.authUserId || resettingUserId === u.id}
                        onClick={() => { void handlePasswordReset(u.id); }}
                      >
                        {resettingUserId === u.id ? "Generating..." : "Copy reset link"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "enquiries" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Enquiry review</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                  aria-label="Search enquiries"
                  placeholder="Search customer, email, phone, work..."
                  value={enquirySearch}
                  onChange={(e) => setEnquirySearch(e.target.value)}
                  style={{ maxWidth: 340 }}
                />
                <select aria-label="Filter enquiry status" value={enquiryStatus} onChange={(e) => setEnquiryStatus(e.target.value)} style={{ maxWidth: 190 }}>
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="quoted">Quoted</option>
                  <option value="converted">Converted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {filteredEnquiries.length === 0 && <p className="muted">No matching enquiries recorded.</p>}
              <div className="grid">
                {filteredEnquiries.map((enquiry) => (
                  <div key={enquiry.id} className="panel-soft">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong>{enquiry.customer.firstName} {enquiry.customer.lastName}</strong>
                        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                          {enquiry.customer.email}
                          {enquiry.customer.phone ? ` | ${enquiry.customer.phone}` : ""}
                          {enquiry.customer.suburb ? ` | ${enquiry.customer.suburb}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Badge tone={enquiry.status === "new" ? "warning" : "neutral"}>{formatLabel(enquiry.status)}</Badge>
                        <span className="muted" style={{ fontSize: 12 }}>{formatDateTime(enquiry.createdAt)}</span>
                      </div>
                    </div>
                    <p style={{ margin: "12px 0 8px" }}>{enquiry.serviceRequest}</p>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      Source: {formatLabel(enquiry.source)}
                      {enquiry.convertedAt ? ` | Converted: ${formatDateTime(enquiry.convertedAt)}` : ""}
                      {enquiry.quote ? ` | Quote: ${enquiry.quote.title} (${formatCurrency(enquiry.quote.amount)}, ${formatLabel(enquiry.quote.status)})` : " | No quote yet"}
                    </p>
                  </div>
                ))}
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
                      <Badge tone={getStatusTone(integration.status)}>{formatLabel(integration.status)}</Badge>
                    </div>
                    {integration.lastTestedAt && (
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                        Last tested: {formatDateTime(integration.lastTestedAt)}
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
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                  aria-label="Search event log"
                  placeholder="Search logs, services, errors..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  style={{ maxWidth: 340 }}
                />
                <select aria-label="Filter event status" value={eventStatus} onChange={(e) => setEventStatus(e.target.value)} style={{ maxWidth: 190 }}>
                  <option value="all">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="timeout">Timeout</option>
                </select>
              </div>
              <div className="panel-soft" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 10px" }}>Add support note or task</h4>
                <div style={{ display: "grid", gap: 10 }}>
                  <select value={supportKind} onChange={(e) => setSupportKind(e.target.value as "note" | "task")} style={{ maxWidth: 180 }}>
                    <option value="note">Support note</option>
                    <option value="task">Support task</option>
                  </select>
                  <textarea
                    rows={3}
                    placeholder="Record what happened, who owns the follow-up, or what needs checking..."
                    value={supportNote}
                    onChange={(e) => setSupportNote(e.target.value)}
                  />
                  <button className="cta" type="button" onClick={() => { void handleSupportNote(); }} style={{ justifySelf: "start" }}>
                    Add to log
                  </button>
                </div>
              </div>
              {filteredEvents.length === 0 && <p className="muted">No matching events recorded.</p>}
              <div className="grid">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="panel-soft"
                    style={{ borderLeft: event.status === "failed" ? "3px solid #dc2626" : "3px solid transparent" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{getServiceLabel(event.service)}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{event.eventType}</span>
                        <Badge tone={getStatusTone(event.status)}>{formatLabel(event.status)}</Badge>
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {formatDateTime(event.createdAt)}
                        {event.durationMs != null && ` · ${event.durationMs}ms`}
                      </span>
                    </div>
                    {event.requestSummary && (
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                        {event.requestSummary}
                      </p>
                    )}
                    {event.triggeredBy && (
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                        Triggered by {event.triggeredBy}
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
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <button
                  className="cta"
                  type="button"
                  onClick={() => { void handleCreateStripeCustomer(); }}
                  disabled={billingBusy === "customer" || Boolean(tenant.stripeCustomerId)}
                >
                  {tenant.stripeCustomerId ? "Stripe customer linked" : billingBusy === "customer" ? "Creating..." : "Create Stripe customer"}
                </button>
                <button
                  className="cta"
                  type="button"
                  onClick={() => { void handleStartStripeCheckout(); }}
                  disabled={billingBusy === "checkout" || tenant.stripeSubscriptionStatus === "active" || tenant.stripeSubscriptionStatus === "trialing"}
                >
                  {billingBusy === "checkout" ? "Creating checkout..." : "Start subscription checkout"}
                </button>
                <button
                  className="cta ghost"
                  type="button"
                  onClick={() => { void handleOpenStripePortal(); }}
                  disabled={billingBusy === "portal" || !tenant.stripeCustomerId}
                >
                  {billingBusy === "portal" ? "Opening..." : "Open Stripe portal"}
                </button>
              </div>
              <table className="w-full text-sm [&_th]:border-b [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:p-3 [&_td]:text-left">
                <tbody>
                  {[
                    ["Plan", tenant.plan],
                    ["Status", formatLabel(tenant.status)],
                    ["Monthly fee", `${formatCurrency(tenant.monthlyFee)}/month`],
                    ["Billing email", tenant.billingEmail ?? "—"],
                    ["Stripe customer", tenant.stripeCustomerId ?? "—"],
                    ["Stripe subscription", tenant.stripeSubscriptionId ?? "—"],
                    ["Stripe subscription status", tenant.stripeSubscriptionStatus ? formatLabel(tenant.stripeSubscriptionStatus) : "—"],
                    ["Stripe price", tenant.stripePriceId ?? "—"],
                    ["Subscription start", tenant.subscriptionStartDate ? formatDate(tenant.subscriptionStartDate) : "—"],
                    ["Trial ends", tenant.trialEndsAt ? formatDate(tenant.trialEndsAt) : "N/A"],
                    ["Member since", formatDate(tenant.createdAt)]
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
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Billing email</div>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    type="email"
                    value={settingsForm.billingEmail}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, billingEmail: e.target.value }))}
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Stripe customer ID</div>
                  <input
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={settingsForm.stripeCustomerId}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, stripeCustomerId: e.target.value }))}
                    placeholder="cus_..."
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
