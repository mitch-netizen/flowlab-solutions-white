export default function TenantUnavailable({
  title = "Tenant portal unavailable",
  message = "We couldn't match this address to an active FlowLab tenant. Double-check the URL or contact the business directly."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main>
      <section className="rounded-lg border bg-card p-4" style={{ maxWidth: 720, margin: "80px auto" }}>
        <div className="eyebrow">FlowLab tenant routing</div>
        <h1>{title}</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 0 }}>{message}</p>
      </section>
    </main>
  );
}
