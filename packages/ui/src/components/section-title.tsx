export function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.28em", color: "#7dd3fc" }}>{eyebrow}</div>
      <h2 style={{ margin: 0, fontSize: 36, fontWeight: 700, color: "#fff" }}>{title}</h2>
      <p style={{ maxWidth: 840, fontSize: 14, lineHeight: 1.7, color: "#cbd5e1", margin: 0 }}>{description}</p>
    </div>
  );
}
