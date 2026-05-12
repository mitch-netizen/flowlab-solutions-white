import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How your information is handled when you use this service."
};

export default function CustomerPrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Last updated: 12 May 2026</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem", color: "#f8fafc" }}>Privacy Notice</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2.5rem", lineHeight: 1.7 }}>
          This notice explains how your personal information is handled when you interact with a business using the FlowLab platform — for example, when you submit an enquiry, receive a quote, sign an agreement, or pay an invoice.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Who is responsible for your data?</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              The business that engaged you (the trades or service business whose name appears on your quote, invoice, or agreement) is the primary controller of your personal information. FlowLab Solutions Pty Ltd provides the software platform that business uses, but your direct relationship is with them.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>What information is collected?</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>The business may collect and store:</p>
            <ul style={{ color: "#94a3b8", lineHeight: 1.9, paddingLeft: "1.25rem", margin: "0.5rem 0" }}>
              <li>Your name, email address, and mobile number</li>
              <li>Your property address and suburb</li>
              <li>Notes about work requested or completed at your property</li>
              <li>Communications you send through the platform (enquiries, messages)</li>
              <li>Signatures collected for agreements</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>How is your information used?</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              Your information is used by the business to manage your job, send quotes and invoices, arrange bookings, follow up on outstanding work, and communicate with you via SMS or email. FlowLab does not use your information for its own marketing.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Third-party services</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              FlowLab uses trusted sub-processors to deliver the platform, including Supabase (database, hosted in Sydney), Brevo (SMS and email delivery), DocuSeal (electronic agreements), Stripe (payment processing), and Google Maps (address and route services). These providers operate under their own privacy policies and handle data only as necessary to deliver the service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Your rights</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              Under the <em>Privacy Act 1988</em> (Cth), you have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact the business directly. If you believe your privacy has been mishandled, you may also contact the Office of the Australian Information Commissioner at{" "}
              <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>oaic.gov.au</a>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>FlowLab platform privacy</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              For information about how FlowLab Solutions handles data at the platform level, see the{" "}
              <a href="https://flowlabsolutions.au/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa" }}>FlowLab Privacy Policy</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
