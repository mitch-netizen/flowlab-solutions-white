import Link from "next/link";
import Image from "next/image";

import { getFlowLabLogoAsset } from "@flowlab/branding";
import { countPublicTenantTrials } from "@flowlab/db";

export const dynamic = "force-dynamic";

const PAINS = [
  "You miss calls while on the tools, then forget who needed what.",
  "Job details end up split across texts, notes, and your calendar.",
  "Quotes get delayed, and good leads book someone else.",
  "Bookings and follow-ups depend on memory at the end of a long day.",
  "You finish onsite work, then spend nights catching up on admin."
];

const SOLUTION_MAP = [
  {
    pain: "Calls and messages get missed",
    outcome: "Every new request lands in one place, ready to action."
  },
  {
    pain: "Customer info is scattered",
    outcome: "Customer details, job history, and notes stay in one record."
  },
  {
    pain: "Quoting is slow and inconsistent",
    outcome: "Send clear quotes faster, then run follow-ups automatically."
  },
  {
    pain: "Work slips between quote and booking",
    outcome: "Move from request to quote to booked job without losing momentum."
  }
];

const HOW_IT_WORKS = ["Capture request", "Send quote", "Book job", "Follow up"];

const BENEFITS = [
  "Faster response to new work",
  "Fewer missed leads",
  "A cleaner, more professional customer experience",
  "Less admin after hours"
];

export default async function MarketingPage() {
  const tenantCount = await countPublicTenantTrials();

  return (
    <main className="shell marketing-home">
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

      <section className="hero hero--clean">
        <div>
          <div className="pill">Built for tradies and service businesses</div>
          <h1 className="hero-title">Less paperwork. More paid work.</h1>
          <p className="muted hero-subtitle">
            FlowLab gives tradies one clear flow for requests, quotes, bookings, customer info,
            and follow-ups. Reply faster, stay organised, and keep jobs moving.
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

        <div className="story-graphic" aria-label="From scattered admin to one clear workflow">
          <div className="story-graphic__lane">
            <p className="story-graphic__label muted">Before</p>
            <div className="story-graphic__chips story-graphic__chips--chaos">
              <span>Missed call</span>
              <span>Text thread</span>
              <span>Paper note</span>
              <span>Calendar</span>
              <span>Late quote</span>
            </div>
          </div>
          <div className="story-graphic__arrow" aria-hidden="true">→</div>
          <div className="story-graphic__lane">
            <p className="story-graphic__label muted">With FlowLab</p>
            <div className="story-graphic__flow">
              {HOW_IT_WORKS.map((step) => (
                <div key={step} className="story-graphic__flow-step">{step}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="proof-strip" aria-label="Proof points">
          <div>
            <p className="muted">Businesses on trial</p>
            <strong className="value">{tenantCount}</strong>
          </div>
          <div>
            <p className="muted">Setup time</p>
            <strong className="value">About 10 minutes</strong>
          </div>
          <div>
            <p className="muted">Built for</p>
            <strong className="value">Tradies and service businesses</strong>
          </div>
        </div>
      </section>

      <section className="panel panel--flat">
        <h2 style={{ marginTop: 0 }}>The problem</h2>
        <p className="muted section-intro">
          Most tradies are doing the job and the office work. That is where leads get missed.
        </p>
        <ul className="plain-list">
          {PAINS.map((pain) => (
            <li key={pain}>{pain}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel--flat">
        <h2 style={{ marginTop: 0 }}>The solution</h2>
        <p className="muted section-intro">
          FlowLab keeps your workflow in one place so nothing gets lost between steps.
        </p>
        <div className="stack-gap">
          {SOLUTION_MAP.map((row) => (
            <div key={row.pain} className="solution-line">
              <p style={{ margin: 0 }}><strong>{row.pain}</strong></p>
              <p className="muted" style={{ margin: 0 }}>{row.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="panel panel--flat">
        <h2 style={{ marginTop: 0 }}>How it works</h2>
        <div className="timeline-rail" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="how-flow">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step} className="flow-step">
              <span className="step-number">{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel--flat">
        <h2 style={{ marginTop: 0 }}>What you get</h2>
        <ul className="plain-list plain-list--benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel--flat final-cta">
        <h2 style={{ marginTop: 0 }}>Start with less risk and less admin</h2>
        <p className="muted">
          Start your 14-day free trial. No credit card. Set it up quickly, send a real quote,
          and see if it saves you time this week.
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
