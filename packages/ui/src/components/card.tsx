import type { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(15, 23, 42, 0.65)",
        padding: 24,
        boxShadow: "0 18px 60px rgba(2, 6, 23, 0.35)"
      }}
    >
      {children}
    </div>
  );
}
