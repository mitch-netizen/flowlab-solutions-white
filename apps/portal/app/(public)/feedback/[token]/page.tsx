import { notFound } from "next/navigation";

import { getFeedbackRequestByToken } from "@flowlab/db";

export default async function FeedbackPage(
  {
    params,
    searchParams
  }: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ submitted?: string; rating?: string; error?: string }>;
  }
) {
  const { token } = await params;
  const query = await searchParams;
  const feedbackRequest = await getFeedbackRequestByToken(token);

  if (!feedbackRequest) {
    notFound();
  }

  const { tenant, customer, job } = feedbackRequest;
  const submitted = query.submitted === "1";
  const submittedRating = Number(query.rating ?? "0");
  const alreadySubmitted = !!feedbackRequest.existingFeedback;

  return (
    <main>
      <section className="surface">
        <div className="eyebrow">{tenant.profile?.businessName ?? tenant.slug}</div>
        <h1>How did we do?</h1>
        <p style={{ color: "#cbd5e1" }}>
          Thanks for choosing {tenant.profile?.businessName ?? tenant.slug}, {customer.firstName}. Your feedback helps this team keep improving.
        </p>
        <div className="surface-soft" style={{ marginTop: 20 }}>
          <strong>Job completed</strong>
          <div style={{ marginTop: 8, color: "#cbd5e1" }}>{job.summary}</div>
          <div style={{ marginTop: 8, color: "#94a3b8" }}>{job.address ?? customer.address ?? "Service address on file"}</div>
        </div>

        {query.error ? (
          <div className="surface-soft" style={{ marginTop: 24, color: "#fca5a5" }}>
            {query.error === "rate_limited"
              ? "Too many feedback attempts were made. Please wait a little and try again."
              : query.error === "rating"
                ? "Please choose a rating between 1 and 5."
                : "This feedback link has expired or is no longer available."}
          </div>
        ) : null}

        {submitted || alreadySubmitted ? (
          <div className="surface-soft" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Thanks for the feedback</h2>
            <p style={{ color: "#cbd5e1", marginBottom: 0 }}>
              {(submitted ? submittedRating : feedbackRequest.existingFeedback?.rating ?? 0) === 5
                ? "We’re glad the job hit the mark. If there’s anything else you need, Lawn & Order would love to help again."
                : "Your note has been recorded and shared with the team."}
            </p>
          </div>
        ) : (
          <form action={`/api/public/feedback/${token}`} method="post" style={{ marginTop: 24 }} className="stack">
            <div className="surface-soft">
              <label htmlFor="rating" style={{ display: "block", fontWeight: 700, marginBottom: 10 }}>
                Rating
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <label
                    key={value}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(148, 163, 184, 0.3)"
                    }}
                  >
                    <input type="radio" name="rating" value={value} required />
                    <span>{value} star{value === 1 ? "" : "s"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="surface-soft">
              <label htmlFor="comment" style={{ display: "block", fontWeight: 700, marginBottom: 10 }}>
                Anything you’d like us to know?
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={5}
                placeholder="Share anything that stood out, good or bad."
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                  background: "rgba(15, 23, 42, 0.35)",
                  color: "white"
                }}
              />
            </div>

            <button className="cta" type="submit">
              Send feedback
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
