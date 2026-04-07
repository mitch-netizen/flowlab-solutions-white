import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Button({ children, className = "", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      {...props}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        background: "#38bdf8",
        padding: "14px 18px",
        fontSize: 14,
        fontWeight: 700,
        color: "#020617",
        border: 0,
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}
