import Link from "next/link";

import { countPublicTenantTrials } from "@flowlab/db";
import { FlowLabBrandLink } from "../../components/flowlab-brand";

export const dynamic = "force-dynamic";

const PIPELINE = [
  {
    number: "01",
    title: "Capture",
    copy: "AI catches enquiries, qualifies the job, and keeps every new request in one place. No more missed calls while you are on the tools."
  },
  {
    number: "02",
    title: "Quote",
    copy: "Turn scattered notes into clear digital quotes, send them fast, and let customers accept from their phone."
  },
  {
    number: "03",
    title: "Book",
    copy: "Move accepted work into the calendar with customer details, job history, and crew notes already attached."
  },
  {
    number: "04",
    title: "Collect",
    copy: "Sync invoices with Xero and trigger polite payment nudges, so the admin keeps moving after the job is done."
  }
];

const PROOF_POINTS = [
  "Requests, quotes, bookings, customers, and follow-ups in one flow.",
  "Professional customer experience without hiring an office admin.",
  "Built for Australian tradies and service businesses."
];

const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    label: "Flow",
    price: "$49",
    description: "For solo operators who need missed enquiries and basic paperwork under control.",
    features: ["AI enquiry capture", "Digital quotes and invoices", "Basic Xero sync", "FlowLab branding"],
    cta: "Get Started"
  },
  {
    id: "pro",
    name: "Pro",
    label: "Lab",
    price: "$99",
    description: "The one-billable-hour plan for operators who want admin to move itself.",
    features: ["Advanced AI quoting", "Auto nudge engine", "Two-way Xero sync", "Custom colours"],
    cta: "Go Pro",
    featured: true
  },
  {
    id: "unlimited",
    name: "Unlimited",
    label: "Solutions",
    price: "$199",
    description: "For growing teams that need a branded operating layer across crews and customers.",
    features: ["Full white labelling", "Custom domains", "Multi-crew view", "Agreement automation"],
    cta: "Scale Now"
  }
];

export default async function MarketingPage() {
  const tenantCount = await countPublicTenantTrials().catch(() => 0);

  return (
    <main className="marketing-home">
      <header className="marketing-nav">
        <FlowLabBrandLink />
        <nav className="marketing-nav__links" aria-label="Primary">
          <Link href="#pipeline">Process</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/login" className="marketing-nav__cta">Login</Link>
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="hero-intro">
          <div className="hero-badge">⚡ Lead-to-Loot Automation</div>
          <h1 className="hero-title">Stop chasing paperwork. <span>Start flowing.</span></h1>
          <p className="muted hero-subtitle">
            The automation platform built for trade businesses. From first call to final payment,
            FlowLab handles enquiries, quotes, bookings, customer info, and follow-ups while you stay on the tools.
          </p>
          <div className="hero-actions">
            <Link
              href="/signup"
              className="marketing-button marketing-button--primary"
            >
              Start 14-Day Free Trial
            </Link>
            <div className="trial-proof">✔ No credit card required</div>
          </div>
        </div>
      </section>

      <section id="pipeline" className="pipeline-section" aria-labelledby="pipeline-heading">
        <div className="marketing-container">
          <h2 id="pipeline-heading">The <span>Lead-to-Loot</span> Pipeline</h2>
          <div className="pipeline-grid">
            {PIPELINE.map((step) => (
              <article key={step.number} className="pipeline-card">
                <div className="pipeline-card__number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="proof-section" aria-label="Why FlowLab works">
        <div className="marketing-container proof-layout">
          <div>
            <h2>Less admin after hours. More paid work in motion.</h2>
            <p className="muted">
              Most tradies are doing the job and the office work. FlowLab gives the business a
              professional front door, a clean workflow, and automatic nudges so good leads do not drift away.
            </p>
          </div>
          <div className="proof-list">
            {PROOF_POINTS.map((point) => (
              <div key={point} className="proof-row">{point}</div>
            ))}
            <div className="proof-row proof-row--metric">
              <span>{tenantCount}</span>
              <strong>businesses already on trial</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section" aria-labelledby="pricing-heading">
        <div className="marketing-container">
          <div className="section-heading">
            <h2 id="pricing-heading">Pricing</h2>
            <p className="muted">Start light, then unlock deeper automation, branding, and crew management as you grow.</p>
          </div>
          <div className="pricing-grid">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.id}
                className={tier.featured ? "pricing-card pricing-card--featured" : "pricing-card"}
              >
                <div className="pricing-card__head">
                  <p>{tier.label}</p>
                  <h3>{tier.name}</h3>
                </div>
                <p className="muted pricing-card__description">{tier.description}</p>
                <div className="pricing-card__price">
                  <strong>{tier.price}</strong>
                  <span className="muted">/mo</span>
                </div>
                <ul className="pricing-card__features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  href={`/signup?tier=${tier.id}`}
                  className={tier.featured ? "marketing-button marketing-button--primary" : "marketing-button marketing-button--dark"}
                >
                  {tier.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "2rem 0" }}>
        <div className="marketing-container" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>© {new Date().getFullYear()} FlowLab Solutions Pty Ltd. All rights reserved.</p>
          <nav style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/privacy" className="muted" style={{ fontSize: 13 }}>Privacy Policy</Link>
            <Link href="/terms" className="muted" style={{ fontSize: 13 }}>Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
