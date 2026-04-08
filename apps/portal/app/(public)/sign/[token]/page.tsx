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
          <form action={`/api/public/sign/${agreement.accessToken}/complete`} method="post" style={{ marginTop: 24 }}>
            <button className="cta" type="submit">
              Complete signature
            </button>
          </form>
        ) : (
          <div style={{ color: "#86efac", marginTop: 24 }}>All signed — you&apos;re good to go. We&apos;ll be in touch with the job details.</div>
        )}
      </section>
    </main>
  );
}
