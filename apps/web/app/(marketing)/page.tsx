import Link from "next/link";
import Image from "next/image";

import { getFlowLabLogoAsset } from "@flowlab/branding";
import { countPublicTenantTrials } from "@flowlab/db";

export const dynamic = "force-dynamic";

const PAINS = [
  "Missed calls and messages sit too long before you reply.",
  "Job details are scattered across texts, notes, and spreadsheets.",
  "Quotes take too long, so leads go cold.",
  "Bookings and follow-ups rely on memory.",
  "Admin work piles up after hours."
];

const SOLUTION_MAP = [
  {
    pain: "Slow response to new requests",
    outcome: "Capture every request in one inbox so you can reply faster."
  },
  {
    pain: "Scattered customer and job info",
    outcome: "Keep customer history, quotes, and jobs together in one record."
  },
  {
    pain: "Manual quoting and missed follow-up",
    outcome: "Send professional quotes quickly and trigger follow-ups automatically."
  },
  {
    pain: "Booking handovers and status confusion",
    outcome: "Move work from quote to booked job in one clear flow."
  }
];

const HOW_IT_WORKS = [
  "Capture request",
  "Send quote",
  "Book job",
  "Follow up"
];

const BENEFITS = [
  "Faster response times",
  "Fewer missed leads",
  "Cleaner customer experience",
  "Less admin at the end of the day"
];

export default async function MarketingPage() {
  const tenantCount = await countPublicTenantTrials();

  return (
    <main className="shell">
      <header className="marketing-nav">
        <Link href="/" className="marketing-nav__brand" aria-label="FlowLab Solutions">
          <Image
            src={getFlowLabLogoAsset("dark")}
            alt="FlowLab Solutions"
            width={180}
            height={44}
            priority
            style={{ width: 180, height: "auto", display: "block" }}
          />
        </Link>
        <nav className="marketing-nav__links" aria-label="Primary">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/login" className="marketing-nav__subtle">Sign in</Link>
          <Link href="/signup" className="marketing-nav__cta">
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="hero hero--compact">
        <div>
          <div className="pill">Built for tradies and service businesses</div>
          <h1 className="hero-title">Stop losing jobs to admin chaos.</h1>
          <p className="muted hero-subtitle">
            FlowLab puts requests, quotes, bookings, customers, and follow-ups into one simple flow.
            Respond faster, look professional, and keep work moving.
          </p>
          <div className="button-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Start free trial
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
            >
              See how it works
            </Link>
          </div>
          <p className="hero-fineprint muted">14-day free trial. No credit card required.</p>
        </div>
        <div className="panel-soft stack-list" aria-label="Proof points">
          <div>
            <p className="muted">Businesses on trial</p>
            <strong className="value">{tenantCount}</strong>
          </div>
          <div>
            <p className="muted">Setup time</p>
            <strong className="value">About 10 minutes</strong>
          </div>
          <div>
            <p className="muted">Focus</p>
            <strong className="value">Tradies and service operators</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>The problem</h2>
        <p className="muted section-intro">
          Most operators lose time and money chasing admin instead of doing paid work.
        </p>
        <div className="cards-3 cards-2">
          {PAINS.map((pain) => (
            <div key={pain} className="panel-soft">
              <p style={{ margin: 0 }}>{pain}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>The solution</h2>
        <p className="muted section-intro">
          FlowLab connects each step so work does not stall between tools.
        </p>
        <div className="stack-gap">
          {SOLUTION_MAP.map((row) => (
            <div key={row.pain} className="panel-soft solution-row">
              <p style={{ margin: 0 }}><strong>{row.pain}</strong></p>
              <p className="muted" style={{ margin: 0 }}>{row.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="panel">
        <h2 style={{ marginTop: 0 }}>How it works</h2>
        <div className="grid steps-grid">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step} className="panel-soft step-card">
              <span className="step-number">{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>What you get</h2>
        <div className="cards-3 cards-2">
          {BENEFITS.map((benefit) => (
            <div key={benefit} className="panel-soft">
              <p style={{ margin: 0 }}>{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel final-cta">
        <h2 style={{ marginTop: 0 }}>Start with less risk and less admin</h2>
        <p className="muted">
          Try FlowLab free for 14 days. Set up in minutes, run your first flow, and keep your current process while you test it.
        </p>
        <div className="button-row" style={{ justifyContent: "center" }}>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Start free trial
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
          >
            See how it works
          </Link>
        </div>
      </section>
    </main>
  );
}
