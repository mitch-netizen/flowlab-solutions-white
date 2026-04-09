import Link from "next/link";

import { getCanonicalRootDomain } from "@flowlab/contracts/server";

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

          <div className="surface" style={{ marginTop: 24, textAlign: "left" }}>
            <label className="label" htmlFor="slug">
              Your business subdomain
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <input
                id="slug"
                className="input"
                type="text"
                placeholder="yourbusiness"
                style={{ flex: 1, minWidth: 140 }}
                onKeyDown={undefined}
              />
              <span className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                .{root}/login
              </span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              For example: if your subdomain is <strong>acme</strong>, visit{" "}
              <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>acme.{root}/login</code>
            </p>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/signup" className="cta">
              Start a free trial
            </Link>
            <a
              href={`mailto:hello@flowlabsolutions.au?subject=Can't find my login`}
              className="secondary-cta"
            >
              Can't find your portal?
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
