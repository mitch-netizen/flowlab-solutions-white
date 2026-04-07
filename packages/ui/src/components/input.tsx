import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={props.className}
      style={{
        width: "100%",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(2, 6, 23, 0.55)",
        color: "#fff",
        padding: "14px 16px",
        fontSize: 14
      }}
    />
  );
}
