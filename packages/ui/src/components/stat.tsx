export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-xl, 20px)",
        border: "1px solid var(--border-subtle)",
        background: "color-mix(in srgb, var(--surface-2) 82%, black)",
        padding: "var(--space-4, 18px)"
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ marginTop: "var(--space-3)", fontSize: 32, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      {detail ? <div style={{ marginTop: "var(--space-1)", fontSize: 14, color: "var(--text-secondary)" }}>{detail}</div> : null}
    </div>
  );
}
