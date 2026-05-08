import Link from "next/link";

import { getCanonicalRootDomain } from "@flowlab/contracts/server";

import { FlowLabBrandLink } from "../../components/flowlab-brand";
import { SubdomainForm } from "./subdomain-form";

export default function LoginPage() {
  const root = getCanonicalRootDomain();

  return (
    <main className="shell">
      <div className="app-topbar">
        <FlowLabBrandLink />
        <Link href="/signup" className="cta">Start free trial</Link>
      </div>
      <section className="auth-shell">
        <div className="hero-card auth-card">
          <div className="hero-badge">Sign in</div>
          <h1>Go to your business portal</h1>
          <p className="muted">
            Your FlowLab dashboard is at your own subdomain — not this page. Type your business address below or check the welcome email you received when you signed up.
          </p>

          <div className="form-panel">
            <label htmlFor="slug">
              Your business subdomain
            </label>
            <SubdomainForm root={root} />
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              For example: if your subdomain is <strong>acme</strong>, visit{" "}
              <code>acme.{root}/login</code>
            </p>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/signup" className="marketing-button marketing-button--primary auth-button">
              Start a free trial
            </Link>
            <a
              href={`mailto:hello@flowlabsolutions.au?subject=Can't find my login`}
              className="marketing-button marketing-button--secondary auth-button"
            >
              Can't find your portal?
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
