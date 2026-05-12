import type { Metadata } from "next";
import Link from "next/link";

import { FlowLabBrandLink } from "../../../components/flowlab-brand";

export const metadata: Metadata = {
  title: "Privacy Policy — FlowLab Solutions",
  description: "How FlowLab Solutions collects, uses, and protects your information."
};

const LAST_UPDATED = "12 May 2026";

export default function PrivacyPage() {
  return (
    <main className="marketing-home">
      <header className="marketing-nav">
        <FlowLabBrandLink />
        <nav className="marketing-nav__links" aria-label="Primary">
          <Link href="/#pipeline">Process</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/login" className="marketing-nav__cta">Login</Link>
        </nav>
      </header>

      <div className="marketing-container" style={{ maxWidth: 760, paddingTop: "3rem", paddingBottom: "5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Last updated: {LAST_UPDATED}</p>
          <h1 style={{ marginBottom: "0.5rem" }}>Privacy Policy</h1>
          <p className="muted">This Privacy Policy describes how FlowLab Solutions Pty Ltd (&ldquo;FlowLab&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) handles personal information collected through our platform and website. FlowLab is committed to protecting your privacy in accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles.</p>
        </div>

        <div className="legal-body">

          <section>
            <h2>1. Who this policy applies to</h2>
            <p>This policy applies to two groups of people:</p>
            <ul>
              <li><strong>Operators</strong> — trades and service businesses that subscribe to and use FlowLab to run their operations.</li>
              <li><strong>End customers</strong> — individuals whose information operators enter into FlowLab (for example, a homeowner who receives a quote). If you are an end customer, please also refer to the privacy notice on the page where you submitted your information, which identifies the business that engaged you.</li>
            </ul>
          </section>

          <section>
            <h2>2. What information we collect</h2>

            <h3>From operators</h3>
            <ul>
              <li>Account details: name, email address, mobile number, business name, ABN, and billing address</li>
              <li>Payment information: processed by Stripe. We do not store raw card numbers.</li>
              <li>Business configuration: service areas, pricing rates, branding preferences, and scheduling preferences</li>
              <li>Usage data: pages visited, features used, errors logged, and automation events</li>
            </ul>

            <h3>From end customers (entered by operators)</h3>
            <ul>
              <li>Contact details: name, email address, mobile number, and suburb</li>
              <li>Property information: address, notes, and job history</li>
              <li>Communications: enquiries, quotes, invoices, and messages exchanged through the platform</li>
              <li>Signatures: collected electronically for agreements via DocuSeal</li>
            </ul>

            <h3>Automatically collected data</h3>
            <ul>
              <li>Device and browser information</li>
              <li>IP addresses and approximate location</li>
              <li>Log files and error reports (via Sentry)</li>
            </ul>
          </section>

          <section>
            <h2>3. How we use your information</h2>
            <p>We use personal information to:</p>
            <ul>
              <li>Provide, operate, and improve the FlowLab platform</li>
              <li>Process subscription payments and send billing-related communications</li>
              <li>Enable operators to send quotes, invoices, reminders, and agreements to their customers</li>
              <li>Deliver transactional SMS and email messages on behalf of operators (via Brevo)</li>
              <li>Optimise job routes and estimate drive times (via Google Maps)</li>
              <li>Provide AI-assisted features such as quote drafting and scheduling (via Anthropic Claude)</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Meet legal and regulatory obligations</li>
            </ul>
            <p>We do not sell personal information to third parties. We do not use end customer data for our own marketing.</p>
          </section>

          <section>
            <h2>4. Third-party services we use</h2>
            <p>FlowLab integrates with the following sub-processors. Each has its own privacy policy governing their use of data.</p>
            <ul>
              <li><strong>Supabase</strong> — database and authentication (data hosted in AWS ap-southeast-2, Sydney)</li>
              <li><strong>Vercel</strong> — application hosting</li>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Brevo</strong> — transactional email and SMS delivery</li>
              <li><strong>Xero</strong> — accounting and invoicing integration (when connected by an operator)</li>
              <li><strong>DocuSeal</strong> — electronic agreement and signature collection</li>
              <li><strong>Google Maps</strong> — address geocoding, route optimisation, and satellite imagery</li>
              <li><strong>Anthropic (Claude)</strong> — AI-assisted quoting, scheduling, and communications drafting</li>
              <li><strong>Sentry</strong> — error monitoring and performance observability</li>
            </ul>
          </section>

          <section>
            <h2>5. Data storage and security</h2>
            <p>All data is stored in Australia (AWS ap-southeast-2, Sydney) via Supabase. Data in transit is encrypted using TLS. Sensitive credentials (API keys, OAuth tokens) are encrypted at rest using AES-256 before database storage.</p>
            <p>We apply role-based access controls, and tenant data is strictly isolated — no operator can access another operator&apos;s data.</p>
          </section>

          <section>
            <h2>6. Data retention</h2>
            <p>We retain your data for as long as your account is active. If you close your account, we will delete or anonymise your data within 90 days unless we are required to retain it by law (for example, for tax or accounting purposes). Automated audit logs may be retained for up to 7 years for compliance purposes.</p>
          </section>

          <section>
            <h2>7. Your rights</h2>
            <p>Under the Australian Privacy Act, you have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or outdated information</li>
              <li>Request deletion of your information (subject to legal obligations)</li>
              <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a></li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:privacy@flowlabsolutions.au">privacy@flowlabsolutions.au</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2>8. Cookies and tracking</h2>
            <p>We use essential session cookies to keep you logged in. We do not use advertising cookies or third-party tracking pixels. Error monitoring (Sentry) may set performance-related identifiers.</p>
          </section>

          <section>
            <h2>9. Changes to this policy</h2>
            <p>We may update this policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date above and, for material changes, notify operators by email at least 14 days before the change takes effect.</p>
          </section>

          <section>
            <h2>10. Contact us</h2>
            <p>For privacy-related questions or requests:</p>
            <p>
              <strong>FlowLab Solutions Pty Ltd</strong><br />
              Email: <a href="mailto:privacy@flowlabsolutions.au">privacy@flowlabsolutions.au</a><br />
              Website: <a href="https://flowlabsolutions.au">flowlabsolutions.au</a>
            </p>
          </section>
        </div>

        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/" className="muted" style={{ fontSize: 14 }}>← Back to home</Link>
          <Link href="/terms" className="muted" style={{ fontSize: 14 }}>Terms of Service →</Link>
        </div>
      </div>
    </main>
  );
}
