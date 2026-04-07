import type { PropsWithChildren } from "react";

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "danger" }>) {
  const toneStyles =
    tone === "success"
      ? { background: "rgba(16, 185, 129, 0.16)", color: "#bbf7d0" }
      : tone === "warning"
        ? { background: "rgba(245, 158, 11, 0.16)", color: "#fde68a" }
        : tone === "danger"
          ? { background: "rgba(244, 63, 94, 0.16)", color: "#fecdd3" }
          : { background: "rgba(255,255,255,0.08)", color: "#e2e8f0" };

  return (
    <span
      style={{
        ...toneStyles,
        display: "inline-flex",
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.18em"
      }}
    >
      {children}
    </span>
  );
}
