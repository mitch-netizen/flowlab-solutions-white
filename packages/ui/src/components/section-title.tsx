export function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.28em", color: "var(--accent-primary)" }}>{eyebrow}</div>
      <h2 style={{ margin: 0, fontSize: 36, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
      <p style={{ maxWidth: 840, fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary))", margin: 0 }}>{description}</p>
    </div>
  );
}
