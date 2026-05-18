import type { CSSProperties, PropsWithChildren } from "react";

export type AlertTone = "neutral" | "success" | "warning" | "danger";

const BORDER_COLOR: Record<AlertTone, string> = {
  neutral: "color-mix(in srgb, var(--text-primary) 20%, transparent)",
  success: "var(--state-success, #22c55e)",
  warning: "var(--state-warning, #f59e0b)",
  danger: "var(--state-danger, #ef4444)"
};

export function Alert({
  tone = "neutral",
  title,
  children,
  style
}: PropsWithChildren<{ tone?: AlertTone; title?: string; style?: CSSProperties }>) {
  const containerStyle: CSSProperties = {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    borderLeft: `3px solid ${BORDER_COLOR[tone]}`,
    background: "var(--surface-1)",
    padding: "var(--space-5)",
    ...style
  };

  return (
    <div role="alert" style={containerStyle}>
      {title ? (
        <p style={{ margin: "0 0 var(--space-2)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{title}</p>
      ) : null}
      <div style={{ color: "color-mix(in srgb, var(--text-primary) 82%, var(--text-secondary))", lineHeight: 1.6, fontSize: 14 }}>
        {children}
      </div>
    </div>
  );
}
