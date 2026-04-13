import Link from "next/link";

import { countPublicTenantTrials } from "@flowlab/db";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "CRM built for field service",
    body: "Every customer in one place — contact details, job history, communication log, and feedback. No spreadsheet, no guessing."
  },
  {
    title: "Job board with swim lanes",
    body: "Quoted → Scheduled → In Progress → Complete → Invoiced → Paid. Every job has a card. Every card links to the customer and the invoice."
  },
  {
    title: "Xero invoicing, properly connected",
    body: "Creating an invoice in FlowLab creates it in Xero instantly — AUTHORISED and ready to collect. Your Xero account is the source of truth."
  },
  {
    title: "Branded customer enquiry",
    body: "Your customers fill in a form on your own branded domain. Every enquiry lands straight in your CRM, ready to quote."
  },
  {
    title: "AI-powered quoting",
    body: "Describe the job, pick the area size and site condition — FlowLab builds a priced quote in seconds using your own rates."
  },
  {
    title: "Digital agreements",
    body: "Quote accepted? A service agreement goes out automatically via DocuSeal. Signed documents are stored against the job."
  },
  {
    title: "Scheduler and mobile app",
    body: "A visual job calendar and a field-ready mobile view so you always know what's on and can mark jobs complete on the go."
  },
  {
    title: "Automated follow-up",
    body: "Feedback requests, 5-star Google review prompts, and rebook reminders all run without you thinking about them."
  }
];

const PLANS = [
  {
    name: "Starter",
    price: "$79",
    note: "per month",
    highlight: false,
    features: [
      "Your own subdomain (yourbusiness.flowlabsolutions.au)",
      "CRM + Job board + Revenue apps",
      "50 jobs per month",
      "50 AI quotes per month",
      "Xero invoicing, enquiry forms, digital agreements"
    ]
  },
  {
    name: "Professional",
    price: "$149",
    note: "per month",
    highlight: true,
    features: [
      "Custom domain (yourbusiness.com.au)",
      "CRM + Job board + Revenue apps",
      "200 jobs per month",
      "200 AI quotes per month",
      "No FlowLab branding — 100% your brand",
      "Make.com automation blueprint pack (16 templates)"
    ]
  },
  {
    name: "Growth",
    price: "$249",
    note: "per month",
    highlight: false,
    features: [
      "Custom domain",
      "Unlimited jobs and AI quotes",
      "Multi-user team access",
      "API access for custom integrations",
      "Priority support"
    ]
  }
];

export default async function MarketingPage() {
  const tenantCount = await countPublicTenantTrials();

  return (
    <main className="shell">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="grid">
          <div className="pill">FlowLab Solutions</div>
          <div className="hero-card">
            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)", lineHeight: 1.05, margin: 0 }}>
              The operating system for your field service business.
            </h1>
            <p className="muted" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 560 }}>
              CRM, job board, and Xero invoicing — all connected, all branded as you.
              FlowLab runs the admin so you can run the jobs.
              Set up in ten minutes. Cancel any time.
            </p>
            <div className="button-row">
              <Link href="/signup" className="cta">
                Start free trial
              </Link>
              <Link href="/signup" className="secondary-cta">
                See how it works
              </Link>
            </div>
          </div>
          <div className="metrics">
            <div className="metric">
              <span className="muted">Businesses on trial</span>
              <strong>{tenantCount}</strong>
            </div>
            <div className="metric">
              <span className="muted">Built for</span>
              <strong>Tradies</strong>
            </div>
            <div className="metric">
              <span className="muted">Setup time</span>
              <strong>~10 min</strong>
            </div>
            <div className="metric">
              <span className="muted">Trial length</span>
              <strong>14 days</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="panel" style={{ marginTop: 0 }}>
        <h2 style={{ marginTop: 0, textAlign: "center" }}>From first enquiry to paid invoice — linked end to end</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
          {[
            ["1", "Enquiry lands in CRM", "Your customer fills in your branded form. It arrives in the CRM ready to quote."],
            ["2", "Quote goes out in seconds", "AI builds a priced quote using your rates. You review and send."],
            ["3", "Agreement signed", "Sent automatically when the customer accepts. Stored against the job."],
            ["4", "Job complete, invoice in Xero", "One click creates the invoice in Xero. Follow-up and rebook run automatically."]
          ].map(([step, title, desc]) => (
            <div key={step} className="panel-soft" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6", marginBottom: 8 }}>{step}</div>
              <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Five apps. One platform. Your brand.</h2>
        <div className="cards-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel-soft">
              <strong style={{ display: "block", marginBottom: 8 }}>{f.title}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plans ───────────────────────────────────────────────── */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Simple, transparent pricing</h2>
        <p className="muted" style={{ marginTop: -8, marginBottom: 24 }}>
          14-day free trial on every plan. No credit card required to start.
        </p>
        <div className="cards-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="panel-soft"
              style={{
                outline: plan.highlight ? "2px solid #3b82f6" : undefined,
                position: "relative",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#3b82f6", color: "#fff",
                  fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999,
                  whiteSpace: "nowrap"
                }}>
                  Most popular
                </div>
              )}
              <div className="pill">{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, margin: "8px 0 2px" }}>
                {plan.price}
                <span style={{ fontSize: 15, fontWeight: 400, color: "#94a3b8" }}> {plan.note}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 24px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, color: "#cbd5e1", fontSize: 14 }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="cta"
                style={{
                  display: "block",
                  textAlign: "center",
                  ...(plan.highlight ? {} : { background: "transparent", border: "1px solid #334155", color: "#e2e8f0" })
                }}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust signals ───────────────────────────────────────── */}
      <section className="panel">
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            ["No credit card required", "Start your 14-day trial with just your email."],
            ["Your brand, your domain", "Professional and Growth plans run entirely under your own domain — no FlowLab mentions."],
            ["Cancel any time", "No lock-in contracts. Downgrade or cancel from your dashboard."],
            ["Australian-built", "Designed specifically for Australian field service operators and tradies."]
          ].map(([title, body]) => (
            <div key={title as string} className="panel-soft">
              <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="panel" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Start your day knowing exactly what's on.</h2>
        <p className="muted" style={{ marginBottom: 24 }}>
          Set up your branded workspace in ten minutes. Your CRM, jobs, and Xero — connected and ready before end of day.
        </p>
        <Link href="/signup" className="cta" style={{ fontSize: 18, padding: "14px 36px" }}>
          Start your free trial
        </Link>
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#3b82f6" }}>
            Sign in
          </Link>
        </p>
      </section>

    </main>
  );
}
