import Link from "next/link";

import { getCanonicalRootDomain } from "@flowlab/contracts/server";

import { SubdomainForm } from "./subdomain-form";

export default function LoginPage() {
  const root = getCanonicalRootDomain();

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <div className="pill">Sign in</div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>Go to your business portal</h1>
          <p className="muted" style={{ fontSize: 16, lineHeight: 1.7 }}>
            Your FlowLab dashboard is at your own subdomain — not this page. Type your business address below or check the welcome email you received when you signed up.
          </p>

          <div className="rounded-lg border bg-card p-4" style={{ marginTop: 24, textAlign: "left" }}>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground" htmlFor="slug">
              Your business subdomain
            </label>
            <SubdomainForm root={root} />
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              For example: if your subdomain is <strong>acme</strong>, visit{" "}
              <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>acme.{root}/login</code>
            </p>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Start a free trial
            </Link>
            <a
              href={`mailto:hello@flowlabsolutions.au?subject=Can't find my login`}
              className="inline-flex items-center justify-center rounded-lg border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
            >
              Can't find your portal?
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
