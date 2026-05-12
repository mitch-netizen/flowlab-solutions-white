import type { Metadata } from "next";
import Link from "next/link";

import { FlowLabBrandLink } from "../../../components/flowlab-brand";

export const metadata: Metadata = {
  title: "Terms of Service — FlowLab Solutions",
  description: "The terms governing your use of the FlowLab Solutions platform."
};

const LAST_UPDATED = "12 May 2026";

export default function TermsPage() {
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
          <h1 style={{ marginBottom: "0.5rem" }}>Terms of Service</h1>
          <p className="muted">These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the FlowLab Solutions platform (&ldquo;FlowLab&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated by FlowLab Solutions Pty Ltd. By creating an account or using the platform, you agree to these Terms. If you do not agree, do not use the platform.</p>
        </div>

        <div className="legal-body">

          <section>
            <h2>1. The service</h2>
            <p>FlowLab is a field service management platform for sole operators and small trades businesses. It provides tools for capturing enquiries, generating quotes, scheduling jobs, managing customers, sending automated communications, and syncing with accounting software.</p>
            <p>We may update, add, or remove features at any time. We will give reasonable notice for changes that materially affect your use of the platform.</p>
          </section>

          <section>
            <h2>2. Eligibility and account registration</h2>
            <p>You must be at least 18 years old and have the legal capacity to enter into a binding contract. By registering, you represent that all information you provide is accurate and that you have authority to bind any business entity on whose behalf you register.</p>
            <p>You are responsible for keeping your login credentials secure and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@flowlabsolutions.au">support@flowlabsolutions.au</a> if you suspect unauthorised access.</p>
          </section>

          <section>
            <h2>3. Free trial</h2>
            <p>New accounts receive a 14-day free trial with access to all platform features. No payment method is required to start a trial. At the end of the trial period, you must select a paid plan to continue using the platform. If you do not, your account will be suspended and your data retained for 30 days before deletion.</p>
          </section>

          <section>
            <h2>4. Subscription and billing</h2>
            <p>Paid plans are billed monthly in advance in Australian dollars (AUD) inclusive of GST. Prices are as listed on our pricing page at the time of subscription.</p>
            <p>Payments are processed by Stripe. By providing payment details, you authorise us to charge your nominated payment method on each billing cycle renewal date.</p>
            <p>If a payment fails, we will retry up to three times over seven days. If payment remains unsuccessful, your account will be suspended until the outstanding balance is settled.</p>
            <p>We reserve the right to adjust pricing with at least 30 days&apos; notice. Price changes apply on your next billing cycle after the notice period.</p>
          </section>

          <section>
            <h2>5. Cancellation and refunds</h2>
            <p>You may cancel your subscription at any time from within the platform or by contacting us. Cancellation takes effect at the end of your current billing period — you retain access until then. We do not provide pro-rata refunds for unused time within a billing period.</p>
            <p>We may, at our discretion, offer a refund in exceptional circumstances. To request one, contact <a href="mailto:support@flowlabsolutions.au">support@flowlabsolutions.au</a> within 7 days of the charge.</p>
          </section>

          <section>
            <h2>6. Your data</h2>
            <p>You retain ownership of all data you enter into FlowLab, including customer records, quotes, invoices, and job history (&ldquo;your data&rdquo;). We do not claim ownership over your data.</p>
            <p>You grant us a limited licence to store, process, and transmit your data for the sole purpose of providing the platform to you. We will not use your data for our own marketing or sell it to third parties.</p>
            <p>Upon account closure, you may export your data before the account is deleted. We will retain your data for 90 days after closure before permanently deleting it, unless a longer retention period is required by law.</p>
          </section>

          <section>
            <h2>7. Your responsibilities</h2>
            <p>You agree to use FlowLab only for lawful purposes and in accordance with these Terms. You must not:</p>
            <ul>
              <li>Use the platform to send spam, unsolicited marketing, or harassing communications</li>
              <li>Attempt to reverse engineer, decompile, or access the platform in an unauthorised manner</li>
              <li>Share your account credentials with third parties outside your business</li>
              <li>Use the platform in a way that violates any applicable law, including the <em>Spam Act 2003</em> (Cth), the <em>Privacy Act 1988</em> (Cth), or the <em>Australian Consumer Law</em></li>
              <li>Upload or transmit malicious code or interfere with the security or integrity of the platform</li>
            </ul>
            <p>You are responsible for ensuring that your use of the platform to communicate with your customers complies with all applicable laws, including obtaining any required consents for SMS and email communications.</p>
          </section>

          <section>
            <h2>8. Third-party integrations</h2>
            <p>FlowLab integrates with third-party services including Xero, Stripe, Brevo, DocuSeal, Google Maps, and Anthropic. Your use of those integrations is subject to the respective third-party terms of service. We are not responsible for the availability, accuracy, or conduct of third-party services.</p>
          </section>

          <section>
            <h2>9. Intellectual property</h2>
            <p>FlowLab and all associated software, designs, trademarks, and content are owned by FlowLab Solutions Pty Ltd or its licensors. Nothing in these Terms grants you any rights in the platform beyond the limited right to use it as described.</p>
            <p>We welcome feedback. By submitting feedback or suggestions, you grant us a perpetual, royalty-free licence to use those ideas without obligation to you.</p>
          </section>

          <section>
            <h2>10. Availability and support</h2>
            <p>We aim to provide a reliable platform but do not guarantee uninterrupted availability. Planned maintenance will be communicated in advance where possible. We provide email support at <a href="mailto:support@flowlabsolutions.au">support@flowlabsolutions.au</a> and aim to respond within one business day (AEST).</p>
          </section>

          <section>
            <h2>11. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, FlowLab Solutions Pty Ltd is not liable for any indirect, incidental, special, or consequential loss arising out of your use of the platform, including loss of revenue, loss of data, or loss of business opportunity.</p>
            <p>Our total liability to you in any 12-month period is capped at the total subscription fees you paid to us in that period.</p>
            <p>Nothing in these Terms excludes or limits rights you may have under the <em>Australian Consumer Law</em> that cannot be excluded by agreement.</p>
          </section>

          <section>
            <h2>12. Suspension and termination</h2>
            <p>We may suspend or terminate your account immediately if you:</p>
            <ul>
              <li>Breach these Terms and fail to remedy the breach within 7 days of notice</li>
              <li>Engage in fraudulent, abusive, or illegal activity using the platform</li>
              <li>Fail to pay outstanding subscription fees after the retry period</li>
            </ul>
            <p>We may also terminate the platform service entirely with 60 days&apos; notice. In that event, we will provide a pro-rata refund for any prepaid unused subscription time.</p>
          </section>

          <section>
            <h2>13. Governing law</h2>
            <p>These Terms are governed by the laws of Queensland, Australia. Any dispute that cannot be resolved informally will be subject to the exclusive jurisdiction of the courts of Queensland.</p>
          </section>

          <section>
            <h2>14. Changes to these Terms</h2>
            <p>We may update these Terms from time to time. Material changes will be communicated by email at least 14 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2>15. Contact</h2>
            <p>
              <strong>FlowLab Solutions Pty Ltd</strong><br />
              Email: <a href="mailto:support@flowlabsolutions.au">support@flowlabsolutions.au</a><br />
              Website: <a href="https://flowlabsolutions.au">flowlabsolutions.au</a>
            </p>
          </section>
        </div>

        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/" className="muted" style={{ fontSize: 14 }}>← Back to home</Link>
          <Link href="/privacy" className="muted" style={{ fontSize: 14 }}>Privacy Policy →</Link>
        </div>
      </div>
    </main>
  );
}
