export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(2, 6, 23, 0.4)",
        padding: 18
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", color: "#94a3b8" }}>{label}</div>
      <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700, color: "#fff" }}>{value}</div>
      {detail ? <div style={{ marginTop: 6, fontSize: 14, color: "#94a3b8" }}>{detail}</div> : null}
    </div>
  );
}
