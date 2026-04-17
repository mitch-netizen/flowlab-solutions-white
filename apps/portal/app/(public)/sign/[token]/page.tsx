import { notFound } from "next/navigation";

import { getAgreementByToken } from "@flowlab/db";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agreement = await getAgreementByToken(token);

  if (!agreement) {
    notFound();
  }

  return (
    <main>
      <section className="surface">
        <div className="eyebrow">{agreement.tenant.profile?.businessName}</div>
        <h1>{agreement.title}</h1>
        <p style={{ color: "#cbd5e1" }}>Please review the agreement below and complete your signature to confirm the job.</p>
        {agreement.status !== "signed" ? (
          <div className="stack" style={{ marginTop: 24 }}>
            {agreement.signingUrl ? (
              <>
                <div className="surface-soft">
                  This agreement is being signed securely through DocuSeal. Open the secure signing session below to review the tenant&apos;s uploaded contract and sign it.
                </div>
                <a className="cta" href={agreement.signingUrl} target="_blank" rel="noreferrer">
                  Open secure signing session
                </a>
              </>
            ) : (
              <form action={`/api/public/sign/${agreement.accessToken}/complete`} method="post">
                <button className="cta" type="submit">
                  Complete signature
                </button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>All signed — you&apos;re good to go. We&apos;ll be in touch with the job details.</div>
        )}
      </section>
    </main>
  );
}
