import type { CSSProperties, PropsWithChildren } from "react";

export function Card({ children, className = "", style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div
      className={className}
      style={{
        borderRadius: "calc(var(--radius-lg) * 2.333)",
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-1)",
        color: "var(--text-primary)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-md)",
        ...style
      }}
    >
      {children}
    </div>
  );
}
