import Link from "next/link";

import { countPublicTenantTrials } from "@flowlab/db";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "CRM built for field service",
    body: "Every customer in one place — contact details, full job history, every message sent, and feedback received. When a customer calls, you know everything in seconds. No spreadsheet. No digging."
  },
  {
    title: "Job board with swim lanes",
    body: "Quoted → Scheduled → In Progress → Complete → Invoiced → Paid. Every job has a card. Every card links to the customer, the agreement, and the invoice. Nothing falls through the gaps."
  },
  {
    title: "Xero invoicing, properly connected",
    body: "One click creates the invoice in Xero as AUTHORISED and ready to collect. No copy-pasting, no re-entering data. Your Xero account stays the source of truth — FlowLab just keeps it current."
  },
  {
    title: "Branded customer enquiry",
    body: "Customers fill in a form on your own domain. Every enquiry arrives in your CRM pre-formatted and ready to quote — no inbox triage, no missed DMs, no duplicate WhatsApp threads."
  },
  {
    title: "AI-powered quoting",
    body: "Describe the job, pick the size and condition. FlowLab prices it using your own rates and drafts the quote in seconds. You review, adjust if needed, and send. Most quotes take under two minutes."
  },
  {
    title: "Digital agreements",
    body: "When a customer accepts a quote, a service agreement goes out automatically via DocuSeal. They sign on their phone. The signed PDF is stored against the job forever — no chasing, no printing."
  },
  {
    title: "Scheduler and mobile app",
    body: "See your full week on a calendar. On the road, switch to the mobile view — check the next address, mark jobs complete, and update notes from site. No laptop required."
  },
  {
    title: "Automated follow-up",
    body: "Post-job feedback requests, 5-star Google review prompts, and rebook reminders run automatically. Most operators recover two to three return jobs per month they would have otherwise lost."
  }
];

const PLANS = [
  {
    name: "Starter",
    price: "$79",
    note: "per month",
    highlight: false,
    features: [
      "Your own branded workspace (yourbusiness.flowlabsolutions.au)",
      "Full CRM, job board, quoting, and invoicing",
      "50 jobs per month",
      "50 AI-assisted quotes per month",
      "Xero connection, enquiry forms, digital agreements"
    ]
  },
  {
    name: "Professional",
    price: "$149",
    note: "per month",
    highlight: true,
    features: [
      "Custom domain — your business URL, no FlowLab branding",
      "Full CRM, job board, quoting, and invoicing",
      "200 jobs per month",
      "200 AI-assisted quotes per month",
      "Make.com automation pack — 16 templates for comms, reminders, and follow-up"
    ]
  },
  {
    name: "Growth",
    price: "$249",
    note: "per month",
    highlight: false,
    features: [
      "Custom domain — unlimited jobs and AI quotes",
      "Multi-user team access",
      "API access for custom integrations",
      "Priority support",
      "Everything in Professional, no caps"
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
              Stop running your field service business from WhatsApp and spreadsheets.
            </h1>
            <p className="muted" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 560 }}>
              FlowLab gives sole operators and small field service teams a complete branded platform — CRM, AI quoting, job scheduling, and Xero invoicing, all connected. Set up in ten minutes. Cancel any time.
            </p>
            <div className="button-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Start free trial
              </Link>
              <Link href="#how-it-works" className="inline-flex items-center justify-center rounded-lg border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
                See how it works
              </Link>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              14-day free trial · No credit card required · Australian-built
            </p>
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

      {/* ── Pain points ─────────────────────────────────────────── */}
      <section className="panel" style={{ marginTop: 0 }}>
        <h2 style={{ marginTop: 0, textAlign: "center" }}>Most sole operators run three systems — and lose jobs between all of them.</h2>
        <div className="cards-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            ["Quoting in WhatsApp", "A voice note, a screenshot, a rough figure. No record, no signed agreement, no follow-up if they go quiet."],
            ["Jobs in a spreadsheet that doesn't talk to Xero", "Two tools with zero connection. Reconciling them eats time you don't have at the end of the week."],
            ["Follow-up that never happens", "You meant to send the rebook reminder and the Google review ask. Then it was Thursday. Then it was next month."],
            ["No visibility on what's actually owed", "You don't know what's quoted, overdue, or outstanding until something goes wrong — usually a cash flow crunch."]
          ].map(([title, body]) => (
            <div key={title as string} className="panel-soft">
              <strong style={{ display: "block", marginBottom: 6 }}>{title as string}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{body as string}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 24, textAlign: "center", maxWidth: 600, margin: "24px auto 0" }}>
          FlowLab connects every step — from the first enquiry to the paid invoice — in one platform that runs under your brand.
        </p>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="panel">
        <h2 style={{ marginTop: 0, textAlign: "center" }}>From first enquiry to paid invoice — linked end to end</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
          {[
            ["1", "Enquiry lands in your CRM", "Your customer fills in your branded form. It arrives in the CRM pre-formatted and ready to quote — no inbox triage."],
            ["2", "AI builds the quote in seconds", "Describe the job, pick the area size and condition. FlowLab prices it using your own rates. You review and send."],
            ["3", "Agreement signed automatically", "When the customer accepts, a service agreement goes out via DocuSeal. Signed and stored against the job."],
            ["4", "Job complete, invoice in Xero", "One click creates the invoice in Xero as AUTHORISED. Follow-up, rebook reminders, and review requests run automatically."]
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
        <h2 style={{ marginTop: 0 }}>Everything you need to run the jobs and grow the business.</h2>
        <p className="muted" style={{ marginTop: -8, marginBottom: 24 }}>
          Eight features, one platform, your brand. No feature you won't use. No gap that sends you back to a spreadsheet.
        </p>
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
                className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
            ["No credit card required", "Start your 14-day trial with just your name and email. No card, no commitment."],
            ["Your brand, your domain", "On Professional and Growth plans, your customers never see FlowLab. Your domain, your colours, your business."],
            ["Cancel any time", "Month-to-month. No lock-in contracts. Downgrade or cancel from your settings in under a minute."],
            ["Australian-built for Australian tradies", "Designed specifically for the way Australian field service operators work. Xero-native, GST-ready, priced for small teams."]
          ].map(([title, body]) => (
            <div key={title as string} className="panel-soft">
              <strong style={{ display: "block", marginBottom: 6 }}>{title as string}</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{body as string}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="panel" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Set up before end of day. Win your first job this week.</h2>
        <p className="muted" style={{ marginBottom: 24, maxWidth: 520, margin: "0 auto 24px" }}>
          Your branded workspace takes ten minutes to configure. Connect Xero, add your services and rates, share your enquiry link — you&apos;re live. First quote can go out the same afternoon.
        </p>
        <Link href="/signup" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" style={{ fontSize: 18, padding: "14px 36px" }}>
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
